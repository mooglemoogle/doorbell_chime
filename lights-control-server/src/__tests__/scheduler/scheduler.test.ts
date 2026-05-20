jest.mock('../../logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

import { Scheduler } from '../../scheduler/scheduler'
import { SchedulerConfig } from '../../scheduler/config'
import { AnimationRunner } from '../../animation/runner'
import { tmpdir } from 'os'
import { join } from 'path'

function tmpPath() {
    return join(tmpdir(), `scheduler-test-${process.pid}-${Date.now()}.json`)
}

function makeRunner(overrides: Partial<Record<string, jest.Mock>> = {}): jest.Mocked<AnimationRunner> {
    return {
        getStatus: jest.fn().mockReturnValue({ running: false, current_cycle: 'Default', brightness: 0.5, transition_time: 2000 }),
        turnOn: jest.fn(),
        turnOffCommand: jest.fn(),
        setBrightness: jest.fn(),
        setCycle: jest.fn(),
        nextAlgorithm: jest.fn(),
        ...overrides,
    } as unknown as jest.Mocked<AnimationRunner>
}

describe('Scheduler', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    test('tick does nothing when disabled', () => {
        const config = new SchedulerConfig(tmpPath())
        config.setValue('enabled', false)
        const runner = makeRunner()
        const scheduler = new Scheduler(config, () => runner)
        scheduler.tick()
        expect(runner.turnOn).not.toHaveBeenCalled()
        expect(runner.turnOffCommand).not.toHaveBeenCalled()
    })

    test('tick does nothing when within manual override window', () => {
        const config = new SchedulerConfig(tmpPath())
        config.setValue('enabled', true)
        // Set a daily window covering midnight to ensure we'd normally turn on
        config.setValue('dailyWindows', [{ onTime: '00:00', offTime: null }])
        const runner = makeRunner()
        const scheduler = new Scheduler(config, () => runner)
        scheduler.notifyManualCommand()
        scheduler.tick()
        expect(runner.turnOn).not.toHaveBeenCalled()
    })

    test('turns on when inside a daily window', () => {
        const config = new SchedulerConfig(tmpPath())
        config.setValue('enabled', true)
        // Window covers all day
        config.setValue('dailyWindows', [{ onTime: '00:00', offTime: null }])
        const runner = makeRunner({ getStatus: jest.fn().mockReturnValue({ running: false, current_cycle: 'Default', brightness: 0.5, transition_time: 2000 }) })
        const scheduler = new Scheduler(config, () => runner)
        scheduler.tick()
        expect(runner.turnOn).toHaveBeenCalled()
    })

    test('turns off when outside all daily windows', () => {
        const config = new SchedulerConfig(tmpPath())
        config.setValue('enabled', true)
        // Window is in the far future (e.g., 23:55–23:59) so we're outside it now
        config.setValue('dailyWindows', [{ onTime: '23:55', offTime: '23:59' }])
        const runner = makeRunner({ getStatus: jest.fn().mockReturnValue({ running: true, current_cycle: 'Default', brightness: 0.5, transition_time: 2000 }) })
        const scheduler = new Scheduler(config, () => runner)
        // Force current time to be 12:00 (midday) - outside 23:55-23:59
        jest.setSystemTime(new Date('2024-06-21T12:00:00'))
        scheduler.tick()
        expect(runner.turnOffCommand).toHaveBeenCalled()
    })

    test('sets brightness from keyframes', () => {
        const config = new SchedulerConfig(tmpPath())
        config.setValue('enabled', true)
        config.setValue('brightnessKeyframes', [{ time: '00:00', brightness: 0.4 }])
        const runner = makeRunner()
        const scheduler = new Scheduler(config, () => runner)
        scheduler.tick()
        expect(runner.setBrightness).toHaveBeenCalledWith(0.4)
    })

    test('does not call setBrightness again when brightness unchanged', () => {
        const config = new SchedulerConfig(tmpPath())
        config.setValue('enabled', true)
        config.setValue('brightnessKeyframes', [{ time: '00:00', brightness: 0.4 }])
        const runner = makeRunner()
        const scheduler = new Scheduler(config, () => runner)
        scheduler.tick()
        scheduler.tick()
        expect(runner.setBrightness).toHaveBeenCalledTimes(1)
    })

    test('sets cycle from calendar override', () => {
        jest.setSystemTime(new Date('2024-12-25T12:00:00'))
        const config = new SchedulerConfig(tmpPath())
        config.setValue('enabled', true)
        config.setValue('calendarOverrides', [{ type: 'annual', date: '12-25', cycle: 'christmas', priority: 0 }])
        const runner = makeRunner({ getStatus: jest.fn().mockReturnValue({ running: false, current_cycle: 'Default', brightness: 0.5, transition_time: 2000 }) })
        const scheduler = new Scheduler(config, () => runner)
        scheduler.tick()
        expect(runner.setCycle).toHaveBeenCalledWith('christmas')
    })

    test('turns off on cycle:null calendar override', () => {
        jest.setSystemTime(new Date('2024-03-15T12:00:00'))
        const config = new SchedulerConfig(tmpPath())
        config.setValue('enabled', true)
        config.setValue('calendarOverrides', [{ type: 'annual', date: '03-15', cycle: null, priority: 0 }])
        const runner = makeRunner({ getStatus: jest.fn().mockReturnValue({ running: true, current_cycle: 'Default', brightness: 0.5, transition_time: 2000 }) })
        const scheduler = new Scheduler(config, () => runner)
        scheduler.tick()
        expect(runner.turnOffCommand).toHaveBeenCalled()
    })

    test('start fires tick immediately and sets interval', () => {
        const config = new SchedulerConfig(tmpPath())
        config.setValue('enabled', false)
        const runner = makeRunner()
        const scheduler = new Scheduler(config, () => runner)
        const tickSpy = jest.spyOn(scheduler, 'tick')
        scheduler.start()
        expect(tickSpy).toHaveBeenCalledTimes(1)
        jest.advanceTimersByTime(60_000)
        expect(tickSpy).toHaveBeenCalledTimes(2)
        scheduler.stop()
    })

    test('stop clears interval', () => {
        const config = new SchedulerConfig(tmpPath())
        const runner = makeRunner()
        const scheduler = new Scheduler(config, () => runner)
        const tickSpy = jest.spyOn(scheduler, 'tick')
        scheduler.start()
        scheduler.stop()
        jest.advanceTimersByTime(120_000)
        expect(tickSpy).toHaveBeenCalledTimes(1) // only the initial tick
    })
})
