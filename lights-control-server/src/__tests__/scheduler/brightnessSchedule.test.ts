import { computeBrightnessAtTime, buildFullDayBrightnessSchedule } from '../../scheduler/brightnessSchedule'
import type { BrightnessKeyframe } from '../../scheduler/types'

const REF = new Date('2024-06-21T00:00:00')
const EMPTY_SOLAR = {}

function makeKF(hhmm: string, brightness: number): BrightnessKeyframe {
    return { time: hhmm, brightness }
}

function atTime(hhmm: string): Date {
    const [h, m] = hhmm.split(':').map(Number)
    const d = new Date(REF)
    d.setHours(h, m, 0, 0)
    return d
}

describe('computeBrightnessAtTime', () => {
    test('returns null when no keyframes', () => {
        expect(computeBrightnessAtTime(atTime('12:00'), [], EMPTY_SOLAR, REF)).toBeNull()
    })

    test('returns flat brightness for single keyframe', () => {
        const result = computeBrightnessAtTime(atTime('12:00'), [makeKF('08:00', 0.6)], EMPTY_SOLAR, REF)
        expect(result).toBe(0.6)
    })

    test('interpolates linearly between two keyframes', () => {
        const kfs = [makeKF('08:00', 0.2), makeKF('10:00', 0.8)]
        // Midpoint should be 0.5
        const result = computeBrightnessAtTime(atTime('09:00'), kfs, EMPTY_SOLAR, REF)
        expect(result).toBeCloseTo(0.5)
    })

    test('clamps to first keyframe value when before earliest', () => {
        const kfs = [makeKF('08:00', 0.3), makeKF('20:00', 0.9)]
        expect(computeBrightnessAtTime(atTime('06:00'), kfs, EMPTY_SOLAR, REF)).toBe(0.3)
    })

    test('clamps to last keyframe value when after latest', () => {
        const kfs = [makeKF('08:00', 0.3), makeKF('20:00', 0.9)]
        expect(computeBrightnessAtTime(atTime('22:00'), kfs, EMPTY_SOLAR, REF)).toBe(0.9)
    })

    test('returns exact keyframe value at keyframe time', () => {
        const kfs = [makeKF('08:00', 0.3), makeKF('20:00', 0.9)]
        expect(computeBrightnessAtTime(atTime('08:00'), kfs, EMPTY_SOLAR, REF)).toBe(0.3)
        expect(computeBrightnessAtTime(atTime('20:00'), kfs, EMPTY_SOLAR, REF)).toBe(0.9)
    })

    test('uses three keyframes with correct segment interpolation', () => {
        const kfs = [makeKF('06:00', 0.0), makeKF('12:00', 0.6), makeKF('18:00', 0.3)]
        // Between 06:00 and 12:00 at 09:00: t=0.5, brightness=0.3
        expect(computeBrightnessAtTime(atTime('09:00'), kfs, EMPTY_SOLAR, REF)).toBeCloseTo(0.3)
        // Between 12:00 and 18:00 at 15:00: t=0.5, brightness=0.45
        expect(computeBrightnessAtTime(atTime('15:00'), kfs, EMPTY_SOLAR, REF)).toBeCloseTo(0.45)
    })

    test('drops keyframes with unresolvable solar events', () => {
        const solarKF: BrightnessKeyframe = { time: { event: 'astronomical_dawn' }, brightness: 0.1 }
        const absKF: BrightnessKeyframe = { time: '12:00', brightness: 0.8 }
        // With empty solar times, solar KF is dropped -> single keyframe -> flat 0.8
        const result = computeBrightnessAtTime(atTime('06:00'), [solarKF, absKF], EMPTY_SOLAR, REF)
        expect(result).toBe(0.8)
    })
})

describe('buildFullDayBrightnessSchedule', () => {
    test('returns empty array when no keyframes', () => {
        expect(buildFullDayBrightnessSchedule([], EMPTY_SOLAR, REF)).toEqual([])
    })

    test('includes keyframe points marked as keyframe source', () => {
        const kfs = [makeKF('08:00', 0.5), makeKF('20:00', 0.8)]
        const points = buildFullDayBrightnessSchedule(kfs, EMPTY_SOLAR, REF)
        const keyframePoints = points.filter(p => p.source === 'keyframe')
        expect(keyframePoints).toHaveLength(2)
        expect(keyframePoints.map(p => p.time)).toContain('08:00')
        expect(keyframePoints.map(p => p.time)).toContain('20:00')
    })

    test('includes interpolated points at 5-minute intervals', () => {
        const kfs = [makeKF('08:00', 0.0), makeKF('20:00', 1.0)]
        const points = buildFullDayBrightnessSchedule(kfs, EMPTY_SOLAR, REF)
        const interpolated = points.filter(p => p.source === 'interpolated')
        expect(interpolated.length).toBeGreaterThan(0)
    })

    test('result is sorted by time', () => {
        const kfs = [makeKF('20:00', 0.8), makeKF('08:00', 0.2)]
        const points = buildFullDayBrightnessSchedule(kfs, EMPTY_SOLAR, REF)
        for (let i = 1; i < points.length; i++) {
            expect(points[i].time >= points[i - 1].time).toBe(true)
        }
    })
})
