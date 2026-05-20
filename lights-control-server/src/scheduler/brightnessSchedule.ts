import type { BrightnessKeyframe, SolarEventName, ResolvedBrightnessPoint } from './types'
import { resolveTime, toMinutesSinceMidnight, formatTime } from './solarTimes'

interface ResolvedKeyframe {
    minutes: number
    brightness: number
    date: Date
}

function resolveKeyframes(
    keyframes: BrightnessKeyframe[],
    solarTimes: Partial<Record<SolarEventName, Date>>,
    referenceDate: Date,
): ResolvedKeyframe[] {
    const resolved: ResolvedKeyframe[] = []
    for (const kf of keyframes) {
        const d = resolveTime(kf.time, solarTimes, referenceDate)
        if (d === null) continue
        resolved.push({ minutes: toMinutesSinceMidnight(d), brightness: kf.brightness, date: d })
    }
    resolved.sort((a, b) => a.minutes - b.minutes)
    return resolved
}

export function computeBrightnessAtTime(
    now: Date,
    keyframes: BrightnessKeyframe[],
    solarTimes: Partial<Record<SolarEventName, Date>>,
    referenceDate: Date,
): number | null {
    const resolved = resolveKeyframes(keyframes, solarTimes, referenceDate)
    if (resolved.length === 0) return null
    if (resolved.length === 1) return resolved[0].brightness

    const nowMins = toMinutesSinceMidnight(now)

    // Before first keyframe — clamp
    if (nowMins <= resolved[0].minutes) return resolved[0].brightness
    // After last keyframe — clamp
    if (nowMins >= resolved[resolved.length - 1].minutes) return resolved[resolved.length - 1].brightness

    // Find bounding pair
    for (let i = 0; i < resolved.length - 1; i++) {
        const before = resolved[i]
        const after = resolved[i + 1]
        if (nowMins >= before.minutes && nowMins <= after.minutes) {
            const span = after.minutes - before.minutes
            if (span === 0) return before.brightness
            const t = (nowMins - before.minutes) / span
            return before.brightness + t * (after.brightness - before.brightness)
        }
    }

    return resolved[resolved.length - 1].brightness
}

export function buildFullDayBrightnessSchedule(
    keyframes: BrightnessKeyframe[],
    solarTimes: Partial<Record<SolarEventName, Date>>,
    referenceDate: Date,
): ResolvedBrightnessPoint[] {
    const resolved = resolveKeyframes(keyframes, solarTimes, referenceDate)
    if (resolved.length === 0) return []

    const points: ResolvedBrightnessPoint[] = []
    const keyframeMinutes = new Set(resolved.map(k => k.minutes))

    // Add keyframe points first
    for (const kf of resolved) {
        points.push({ time: formatTime(kf.date), brightness: kf.brightness, source: 'keyframe' })
    }

    // Add interpolated points every 5 minutes
    for (let mins = 0; mins < 24 * 60; mins += 5) {
        if (keyframeMinutes.has(mins)) continue
        const d = new Date(referenceDate)
        d.setHours(Math.floor(mins / 60), mins % 60, 0, 0)
        const brightness = computeBrightnessAtTime(d, keyframes, solarTimes, referenceDate)
        if (brightness !== null) {
            points.push({ time: formatTime(d), brightness, source: 'interpolated' })
        }
    }

    points.sort((a, b) => a.time.localeCompare(b.time))
    return points
}
