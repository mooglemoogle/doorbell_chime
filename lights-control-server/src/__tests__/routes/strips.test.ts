import express, { Router, Request } from 'express'
import stripsRouter from '../../routes/strips'
import { StripManager, ConnectedStrip } from '../../strips/manager'
import { ResolvedStrip } from '../../strips/registry'
import { WebSocket } from 'ws'

function mockRes() {
  const res = { status: jest.fn(), json: jest.fn() }
  res.status.mockReturnValue(res)
  return res
}

function mockReq(): Partial<Request> {
  return {}
}

function captureHandlers(router: Router): Map<string, (...args: any[]) => void> {
  const handlers = new Map<string, (...args: any[]) => void>()
  ;(router as any).get = jest.fn((path: string, handler: any) => handlers.set(`GET ${path}`, handler))
  return handlers
}

function makeConnectedStrip(id: string, numPixels = 10, pixelOffset = 0): ConnectedStrip {
  const meta: ResolvedStrip = {
    stripId: id,
    numPixels,
    bpp: 3,
    pixelOffset,
    physical: {
      length_meters: 1,
      location: { start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 } },
    },
  }
  return {
    stripId: id,
    socket: { readyState: WebSocket.OPEN } as unknown as WebSocket,
    meta,
    bufferedFrames: 5,
    lastSeen: 1_700_000_000_000,
  }
}

describe('Strips routes', () => {
  let manager: jest.Mocked<StripManager>
  let handlers: Map<string, (...args: any[]) => void>

  beforeEach(() => {
    manager = {
      getConnected: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<StripManager>

    const router = express.Router()
    handlers = captureHandlers(router)
    stripsRouter(router, manager)
  })

  describe('GET /api/strips', () => {
    test('responds 200 with empty array when no strips connected', () => {
      const res = mockRes()
      handlers.get('GET /api/strips')!(mockReq(), res)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith([])
    })

    test('responds with connected strip metadata', () => {
      const strip = makeConnectedStrip('strip-a', 30, 0)
      manager.getConnected.mockReturnValue([strip])

      const res = mockRes()
      handlers.get('GET /api/strips')!(mockReq(), res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          stripId: 'strip-a',
          numPixels: 30,
          pixelOffset: 0,
          bufferedFrames: 5,
          lastSeen: 1_700_000_000_000,
        }),
      ])
    })

    test('includes physical location in response', () => {
      const strip = makeConnectedStrip('strip-a')
      manager.getConnected.mockReturnValue([strip])

      const res = mockRes()
      handlers.get('GET /api/strips')!(mockReq(), res)

      const result = (res.json as jest.Mock).mock.calls[0][0]
      expect(result[0].physical).toBeDefined()
      expect(result[0].physical.length_meters).toBe(1)
    })

    test('returns all connected strips', () => {
      manager.getConnected.mockReturnValue([
        makeConnectedStrip('strip-a', 10, 0),
        makeConnectedStrip('strip-b', 20, 10),
      ])

      const res = mockRes()
      handlers.get('GET /api/strips')!(mockReq(), res)

      const result = (res.json as jest.Mock).mock.calls[0][0]
      expect(result).toHaveLength(2)
      expect(result.map((s: any) => s.stripId).sort()).toEqual(['strip-a', 'strip-b'])
    })

    test('does not include the socket object in the response', () => {
      manager.getConnected.mockReturnValue([makeConnectedStrip('strip-a')])

      const res = mockRes()
      handlers.get('GET /api/strips')!(mockReq(), res)

      const result = (res.json as jest.Mock).mock.calls[0][0]
      expect(result[0].socket).toBeUndefined()
    })
  })
})
