jest.mock('../../logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

import express, { Router, Request, Response } from 'express'
import actionsRouter from '../../routes/actions'
import { AnimationRunner } from '../../animation/runner'

function mockRes(): { status: jest.Mock; json: jest.Mock; send: jest.Mock } {
  const res = { status: jest.fn(), json: jest.fn(), send: jest.fn() }
  res.status.mockReturnValue(res)
  return res
}

function mockReq(params: Record<string, string> = {}): Partial<Request> {
  return { params, ip: '127.0.0.1' }
}

/** Capture route handlers by intercepting router.get/post calls */
function captureHandlers(router: Router): Map<string, (...args: any[]) => void> {
  const handlers = new Map<string, (...args: any[]) => void>()
  ;(router as any).get = jest.fn((path: string, handler: any) => handlers.set(`GET ${path}`, handler))
  ;(router as any).post = jest.fn((path: string, handler: any) => handlers.set(`POST ${path}`, handler))
  return handlers
}

describe('Actions routes', () => {
  let runner: jest.Mocked<AnimationRunner>
  let handlers: Map<string, (...args: any[]) => void>

  beforeEach(() => {
    runner = {
      getStatus: jest.fn().mockReturnValue({ brightness: 0.5, running: false }),
      getCycleNames: jest.fn().mockReturnValue(['Default', 'Holiday']),
      setBrightness: jest.fn(),
      setCycle: jest.fn(),
      turnOn: jest.fn(),
      turnOffCommand: jest.fn(),
      nextAlgorithm: jest.fn(),
    } as unknown as jest.Mocked<AnimationRunner>

    const router = express.Router()
    handlers = captureHandlers(router)
    actionsRouter(router, () => runner)
  })

  describe('GET /api/actions/get_status', () => {
    test('responds 200 with accepted and runner status', () => {
      const res = mockRes()
      handlers.get('GET /api/actions/get_status')!(mockReq(), res)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ accepted: true, response: runner.getStatus() })
    })
  })

  describe('GET /api/actions/get_cycles', () => {
    test('responds 200 with accepted and cycle names', () => {
      const res = mockRes()
      handlers.get('GET /api/actions/get_cycles')!(mockReq(), res)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ accepted: true, response: ['Default', 'Holiday'] })
    })
  })

  describe('POST /api/actions/set_brightness/:new_brightness', () => {
    test('calls setBrightness with parsed float and responds 202', () => {
      const res = mockRes()
      handlers.get('POST /api/actions/set_brightness/:new_brightness')!(
        mockReq({ new_brightness: '0.75' }), res,
      )
      expect(runner.setBrightness).toHaveBeenCalledWith(0.75)
      expect(res.status).toHaveBeenCalledWith(202)
      expect(res.json).toHaveBeenCalledWith({ accepted: true })
    })

    test('responds 400 when brightness is not a number', () => {
      const res = mockRes()
      handlers.get('POST /api/actions/set_brightness/:new_brightness')!(
        mockReq({ new_brightness: 'abc' }), res,
      )
      expect(runner.setBrightness).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ accepted: false }))
    })
  })

  describe('POST /api/actions/set_cycle/:new_cycle', () => {
    test('calls setCycle with the cycle name and responds 202', () => {
      const res = mockRes()
      handlers.get('POST /api/actions/set_cycle/:new_cycle')!(
        mockReq({ new_cycle: 'Holiday' }), res,
      )
      expect(runner.setCycle).toHaveBeenCalledWith('Holiday')
      expect(res.status).toHaveBeenCalledWith(202)
      expect(res.json).toHaveBeenCalledWith({ accepted: true })
    })
  })

  describe('POST /api/actions/:command', () => {
    function callCommand(command: string) {
      const res = mockRes()
      handlers.get('POST /api/actions/:command')!(mockReq({ command }), res)
      return res
    }

    test('on → calls turnOn and responds 202', () => {
      const res = callCommand('on')
      expect(runner.turnOn).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(202)
    })

    test('off → calls turnOffCommand and responds 202', () => {
      const res = callCommand('off')
      expect(runner.turnOffCommand).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(202)
    })

    test('next → calls nextAlgorithm and responds 202', () => {
      const res = callCommand('next')
      expect(runner.nextAlgorithm).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(202)
    })

    test('unknown command → responds 404', () => {
      const res = callCommand('unknowncommand')
      expect(res.status).toHaveBeenCalledWith(404)
      expect(runner.turnOn).not.toHaveBeenCalled()
    })

    test('commands are case-insensitive (ON → on)', () => {
      const res = callCommand('ON')
      expect(runner.turnOn).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(202)
    })
  })
})
