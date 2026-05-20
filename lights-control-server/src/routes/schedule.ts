import { Router } from 'express'
import type { SchedulerConfig } from '../scheduler/config'
import type { Scheduler } from '../scheduler/scheduler'
import { getSolarTimes, resolveTime, formatTime } from '../scheduler/solarTimes'
import { resolveCalendarOverride } from '../scheduler/calendarResolver'
import { buildFullDayBrightnessSchedule } from '../scheduler/brightnessSchedule'
import type { ResolvedSolarTimes, ResolvedWindow, SchedulePreview, SolarEventName } from '../scheduler/types'
import logger from '../logger'

const SOLAR_EVENT_NAMES: SolarEventName[] = [
    'astronomical_dawn',
    'nautical_dawn',
    'civil_dawn',
    'sunrise',
    'solar_noon',
    'sunset',
    'civil_dusk',
    'nautical_dusk',
    'astronomical_dusk',
]

export default (router: Router, config: SchedulerConfig, scheduler: Scheduler) => {
    router.get('/api/schedule', (_req, res) => {
        res.status(200).json({ accepted: true, response: config.properties })
    })

    router.put('/api/schedule', (req, res) => {
        const body = req.body as Partial<typeof config.properties>
        const allowed = ['enabled', 'location', 'dailyWindows', 'brightnessKeyframes', 'calendarOverrides'] as const
        for (const key of allowed) {
            if (key in body) {
                // @ts-expect-error dynamic key assignment
                config.setValue(key, body[key])
            }
        }
        logger.info('Schedule config updated', { ip: req.ip })
        scheduler.tick()
        res.status(202).json({ accepted: true })
    })

    router.get('/api/schedule/preview', (_req, res) => {
        const cfg = config.properties
        const now = new Date()

        const { latitude, longitude } = cfg.location
        const solarTimes =
            latitude !== null && longitude !== null
                ? getSolarTimes(now, latitude, longitude)
                : {}

        // Build solar times display
        const solarTimesDisplay: Partial<Record<SolarEventName, string>> = {}
        for (const name of SOLAR_EVENT_NAMES) {
            const d = solarTimes[name]
            if (d) solarTimesDisplay[name] = formatTime(d)
        }

        const resolvedSolarTimes: ResolvedSolarTimes = {
            date: now.toISOString().slice(0, 10),
            times: solarTimesDisplay,
        }

        // Brightness schedule
        const brightnessSchedule = buildFullDayBrightnessSchedule(
            cfg.brightnessKeyframes,
            solarTimes,
            now,
        )

        // Resolved windows
        const resolvedWindows: ResolvedWindow[] = cfg.dailyWindows.map(w => {
            const onDate = resolveTime(w.onTime, solarTimes, now)
            const offDate = w.offTime !== null ? resolveTime(w.offTime, solarTimes, now) : null
            return {
                onTime: onDate ? formatTime(onDate) : null,
                offTime: offDate ? formatTime(offDate) : null,
            }
        })

        // Active calendar override
        const activeOverride = resolveCalendarOverride(now, cfg.calendarOverrides)

        const preview: SchedulePreview = {
            solarTimes: resolvedSolarTimes,
            brightnessSchedule,
            resolvedWindows,
            activeOverride,
        }

        res.status(200).json({ accepted: true, response: preview })
    })
}
