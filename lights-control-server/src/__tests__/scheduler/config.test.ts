import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { SchedulerConfig } from '../../scheduler/config'

function tmpPath(tag = '') {
    return join(tmpdir(), `test-scheduler-config-${tag}-${process.pid}-${Date.now()}.json`)
}

describe('SchedulerConfig', () => {
    describe('defaults', () => {
        test('uses defaults when file does not exist', () => {
            const s = new SchedulerConfig(tmpPath('new'))
            expect(s.getValue('enabled')).toBe(false)
            expect(s.getValue('location')).toEqual({ latitude: null, longitude: null })
            expect(s.getValue('dailyWindows')).toEqual([])
            expect(s.getValue('brightnessKeyframes')).toEqual([])
            expect(s.getValue('calendarOverrides')).toEqual([])
        })
    })

    describe('loading from existing file', () => {
        test('reads existing values', () => {
            const path = tmpPath('existing')
            writeFileSync(path, JSON.stringify({ enabled: true, location: { latitude: 40.7, longitude: -74.0 }, dailyWindows: [], brightnessKeyframes: [], calendarOverrides: [] }))
            const s = new SchedulerConfig(path)
            expect(s.getValue('enabled')).toBe(true)
            expect(s.getValue('location')).toEqual({ latitude: 40.7, longitude: -74.0 })
            unlinkSync(path)
        })

        test('falls back to defaults for missing keys', () => {
            const path = tmpPath('partial')
            writeFileSync(path, JSON.stringify({ enabled: true }))
            const s = new SchedulerConfig(path)
            expect(s.getValue('enabled')).toBe(true)
            expect(s.getValue('dailyWindows')).toEqual([])
            unlinkSync(path)
        })
    })

    describe('getValue and setValue', () => {
        test('setValue updates in-memory value immediately', () => {
            const s = new SchedulerConfig(tmpPath('set'))
            s.setValue('enabled', true)
            expect(s.getValue('enabled')).toBe(true)
        })

        test('setValue updates properties object immediately', () => {
            const s = new SchedulerConfig(tmpPath('setprops'))
            s.setValue('enabled', true)
            expect(s.properties.enabled).toBe(true)
        })
    })

    describe('file persistence (debounced)', () => {
        test('writes file after 500ms debounce', () => {
            jest.useFakeTimers()
            const path = tmpPath('persist')
            const s = new SchedulerConfig(path)
            s.setValue('enabled', true)
            expect(existsSync(path)).toBe(false)
            jest.advanceTimersByTime(500)
            expect(existsSync(path)).toBe(true)
            const s2 = new SchedulerConfig(path)
            expect(s2.getValue('enabled')).toBe(true)
            jest.useRealTimers()
            if (existsSync(path)) unlinkSync(path)
        })

        test('debounce resets on rapid successive calls', () => {
            jest.useFakeTimers()
            const path = tmpPath('debounce')
            const s = new SchedulerConfig(path)
            s.setValue('enabled', false)
            jest.advanceTimersByTime(300)
            s.setValue('enabled', true)
            jest.advanceTimersByTime(300)
            expect(existsSync(path)).toBe(false)
            jest.advanceTimersByTime(200)
            expect(existsSync(path)).toBe(true)
            const s2 = new SchedulerConfig(path)
            expect(s2.getValue('enabled')).toBe(true)
            jest.useRealTimers()
            if (existsSync(path)) unlinkSync(path)
        })
    })
})
