// Mock the logger module to prevent file I/O during tests
jest.mock('../../logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

import { AnimationRunner } from '../../animation/runner'
import { Status, StatusProperties } from '../../status'
import { Cycles } from '../../cycles'
import { StripRegistry } from '../../strips/registry'
import { FrameGenerator } from '../../animation/frameGenerator'
import { Cycle } from '../../cycle'

function makeMockStatus(overrides: Partial<StatusProperties> = {}): jest.Mocked<Status> {
  const props: StatusProperties = {
    brightness: 0.5,
    transition_time: 2000,
    running: false,
    current_cycle: 'Default',
    ...overrides,
  }
  return {
    getValue: jest.fn((k: keyof StatusProperties) => props[k]) as any,
    setValue: jest.fn((k: keyof StatusProperties, v: any) => { (props as any)[k] = v }),
    properties: props,
  } as unknown as jest.Mocked<Status>
}

function makeMockCycle(entries = [{ algorithm: 'off', seconds_in_cycle: 60, options: {} }]): Cycle {
  return { name: 'Default', cycles: entries } as Cycle
}

function makeMockCycles(cycle?: Cycle): jest.Mocked<Cycles> {
  const c = cycle ?? makeMockCycle()
  return {
    getCycle: jest.fn().mockReturnValue(c),
    cycleNames: ['Default', 'Holiday'],
  } as unknown as jest.Mocked<Cycles>
}

function makeMockRegistry(totalPixels = 10): jest.Mocked<StripRegistry> {
  return {
    totalPixels,
    strips: [],
  } as unknown as jest.Mocked<StripRegistry>
}

function makeMockFrameGenerator(): jest.Mocked<FrameGenerator> {
  return {
    sendFrame: jest.fn().mockResolvedValue(undefined),
    broadcastSync: jest.fn(),
  } as unknown as jest.Mocked<FrameGenerator>
}

function makeRunner(statusOverrides: Partial<StatusProperties> = {}) {
  const status = makeMockStatus(statusOverrides)
  const cycles = makeMockCycles()
  const registry = makeMockRegistry()
  const frameGenerator = makeMockFrameGenerator()
  const runner = new AnimationRunner(status, cycles, registry, frameGenerator)
  return { runner, status, cycles, registry, frameGenerator }
}

describe('AnimationRunner', () => {
  describe('getStatus', () => {
    test('returns status.properties', () => {
      const { runner, status } = makeRunner()
      expect(runner.getStatus()).toBe(status.properties)
    })
  })

  describe('getCycleNames', () => {
    test('returns cycle names from Cycles', () => {
      const { runner } = makeRunner()
      expect(runner.getCycleNames()).toEqual(['Default', 'Holiday'])
    })
  })

  describe('setBrightness', () => {
    test('calls status.setValue with the clamped value', () => {
      const { runner, status } = makeRunner()
      runner.setBrightness(0.8)
      expect(status.setValue).toHaveBeenCalledWith('brightness', 0.8)
    })

    test('clamps value above 1.0 to 1.0', () => {
      const { runner, status } = makeRunner()
      runner.setBrightness(1.5)
      expect(status.setValue).toHaveBeenCalledWith('brightness', 1.0)
    })

    test('clamps value below 0.0 to 0.0', () => {
      const { runner, status } = makeRunner()
      runner.setBrightness(-0.5)
      expect(status.setValue).toHaveBeenCalledWith('brightness', 0.0)
    })

    test('passes 0.0 through unchanged', () => {
      const { runner, status } = makeRunner()
      runner.setBrightness(0.0)
      expect(status.setValue).toHaveBeenCalledWith('brightness', 0.0)
    })
  })

  describe('setCycle', () => {
    test('calls cycles.getCycle with the given name', () => {
      const { runner, cycles } = makeRunner()
      runner.setCycle('Holiday')
      expect(cycles.getCycle).toHaveBeenCalledWith('Holiday')
    })

    test('persists the new cycle name to status', () => {
      const { runner, status } = makeRunner()
      runner.setCycle('Holiday')
      expect(status.setValue).toHaveBeenCalledWith('current_cycle', 'Holiday')
    })

    test('does not call nextAlgorithm when currently off', () => {
      // With running=false, isOff() is false after construction (in transition),
      // so setCycle() with running=false and isOff()=false → no nextAlgorithm call
      const { runner, frameGenerator } = makeRunner({ running: false })
      const callsBefore = (frameGenerator.broadcastSync as jest.Mock).mock.calls.length
      runner.setCycle('Holiday')
      // broadcastSync is called in nextAlgorithm — check it wasn't called again
      expect(frameGenerator.broadcastSync).toHaveBeenCalledTimes(callsBefore)
    })
  })

  describe('fps', () => {
    test('returns the refresh rate of the current algorithm', () => {
      // After construction with running=false, curAlg is transitionAlg (60fps)
      const { runner } = makeRunner()
      expect(runner.fps()).toBe(60)
    })
  })

  describe('isInTransition / isOff', () => {
    test('isInTransition is true immediately after construction (running=false)', () => {
      const { runner } = makeRunner({ running: false })
      expect(runner.isInTransition()).toBe(true)
    })

    test('isOff is false while transitioning', () => {
      const { runner } = makeRunner({ running: false })
      expect(runner.isOff()).toBe(false)
    })
  })

  describe('turnOn', () => {
    test('does nothing when not in off state', () => {
      // After construction with running=false, curAlg=transitionAlg so isOff()=false
      const { runner, status, frameGenerator } = makeRunner({ running: false })
      const callsBefore = (frameGenerator.broadcastSync as jest.Mock).mock.calls.length
      runner.turnOn()
      expect(status.setValue).not.toHaveBeenCalledWith('running', true)
      expect(frameGenerator.broadcastSync).toHaveBeenCalledTimes(callsBefore)
    })

    test('calls nextAlgorithm and sets running=true when off', () => {
      const { runner, status, frameGenerator } = makeRunner({ running: false })
      // Force the runner into the off state
      ;(runner as any).curAlg = (runner as any).offAlg
      const syncBefore = (frameGenerator.broadcastSync as jest.Mock).mock.calls.length
      runner.turnOn()
      expect(status.setValue).toHaveBeenCalledWith('running', true)
      expect(frameGenerator.broadcastSync).toHaveBeenCalledTimes(syncBefore + 1)
    })
  })

  describe('turnOffCommand', () => {
    test('calls turnOff and sets running=false when not already off', () => {
      // After construction with running=false, curAlg=transitionAlg → isOff()=false
      const { runner, status } = makeRunner({ running: false })
      runner.turnOffCommand()
      expect(status.setValue).toHaveBeenCalledWith('running', false)
    })

    test('does nothing when already in off state', () => {
      const { runner, status } = makeRunner({ running: false })
      ;(runner as any).curAlg = (runner as any).offAlg
      runner.turnOffCommand()
      expect(status.setValue).not.toHaveBeenCalledWith('running', false)
    })
  })

  describe('nextAlgorithm', () => {
    test('creates an algorithm from the current cycle entry', () => {
      const { runner, frameGenerator } = makeRunner({ running: false })
      const syncBefore = (frameGenerator.broadcastSync as jest.Mock).mock.calls.length
      runner.nextAlgorithm()
      expect(frameGenerator.broadcastSync).toHaveBeenCalledTimes(syncBefore + 1)
    })

    test('advances cycleIndex wrapping around at the end', () => {
      const cycle = makeMockCycle([
        { algorithm: 'off', seconds_in_cycle: 10, options: {} },
        { algorithm: 'off', seconds_in_cycle: 20, options: {} },
      ])
      const { runner } = makeRunner()
      ;(runner as any).currentCycle = cycle
      ;(runner as any).cycleIndex = 1 // at last entry
      runner.nextAlgorithm()
      expect((runner as any).cycleIndex).toBe(0) // wraps
    })

    test('throws for unknown algorithm name', () => {
      const badCycle = makeMockCycle([{ algorithm: 'nonexistent_algo', seconds_in_cycle: 10, options: {} }])
      const { runner } = makeRunner()
      ;(runner as any).currentCycle = badCycle
      ;(runner as any).cycleIndex = -1
      expect(() => runner.nextAlgorithm()).toThrow('Unknown algorithm')
    })
  })

  describe('start / stop', () => {
    test('stop() halts the loop', async () => {
      const { runner, frameGenerator } = makeRunner({ running: false })
      // Force off so tick() doesn't try to send frames
      ;(runner as any).curAlg = (runner as any).offAlg
      ;(runner as any).nextAlg = (runner as any).offAlg

      const stopPromise = runner.start()
      runner.stop()
      await stopPromise // should resolve promptly
      expect(frameGenerator.sendFrame).not.toHaveBeenCalled()
    })
  })
})
