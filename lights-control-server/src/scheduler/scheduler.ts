import type { AnimationRunner } from '../animation/runner'
import type { SchedulerConfig } from './config'
import { getSolarTimes, resolveTime, toMinutesSinceMidnight } from './solarTimes'
import { resolveCalendarOverride } from './calendarResolver'
import { computeBrightnessAtTime } from './brightnessSchedule'
import logger from '../logger'

function midnight(date: Date): Date {
    const m = new Date(date)
    m.setHours(23, 59, 59, 999)
    return m
}

export class Scheduler {
    private interval: ReturnType<typeof setInterval> | null = null
    private lastBrightness: number | null = null
    private manualOverrideUntil: Date | null = null

    constructor(
        private readonly config: SchedulerConfig,
        private readonly getRunner: () => AnimationRunner,
    ) {}

    start(): void {
        this.tick()
        this.interval = setInterval(() => this.tick(), 60_000)
    }

    stop(): void {
        if (this.interval !== null) {
            clearInterval(this.interval)
            this.interval = null
        }
    }

    /** Call after any manual command so the scheduler backs off for the rest of the day */
    notifyManualCommand(): void {
        this.manualOverrideUntil = midnight(new Date())
        logger.info('Scheduler: manual override active until midnight')
    }

    tick(): void {
        const cfg = this.config.properties
        if (!cfg.enabled) return

        const now = new Date()
        if (this.manualOverrideUntil !== null && now < this.manualOverrideUntil) return

        const { latitude, longitude } = cfg.location
        const solarTimes =
            latitude !== null && longitude !== null
                ? getSolarTimes(now, latitude, longitude)
                : {}

        const runner = this.getRunner()

        // 1. Calendar override — set cycle (or turn off)
        const override = resolveCalendarOverride(now, cfg.calendarOverrides)
        if (override !== null) {
            if (override.cycle === null) {
                // Explicit "off" day — turn off and skip on/off window logic
                const status = runner.getStatus()
                if (status.running) runner.turnOffCommand()
                return
            }
            const status = runner.getStatus()
            if (status.current_cycle !== override.cycle) {
                runner.setCycle(override.cycle)
            }
        }

        // 2. Daily windows — determine if we should be on
        const nowMins = toMinutesSinceMidnight(now)
        let shouldBeOn = false

        for (const window of cfg.dailyWindows) {
            const onDate = resolveTime(window.onTime, solarTimes, now)
            if (onDate === null) continue
            const onMins = toMinutesSinceMidnight(onDate)

            let offMins: number | null = null
            if (window.offTime !== null) {
                const offDate = resolveTime(window.offTime, solarTimes, now)
                if (offDate !== null) offMins = toMinutesSinceMidnight(offDate)
            }

            const inWindow = offMins === null ? nowMins >= onMins : nowMins >= onMins && nowMins < offMins
            if (inWindow) {
                shouldBeOn = true
                break
            }
        }

        const status = runner.getStatus()
        if (shouldBeOn && !status.running) {
            logger.info('Scheduler: turning on')
            runner.turnOn()
        } else if (!shouldBeOn && status.running) {
            logger.info('Scheduler: turning off')
            runner.turnOffCommand()
        }

        // 3. Brightness interpolation
        const brightness = computeBrightnessAtTime(now, cfg.brightnessKeyframes, solarTimes, now)
        if (brightness !== null && brightness !== this.lastBrightness) {
            this.lastBrightness = brightness
            runner.setBrightness(brightness)
        }
    }
}
