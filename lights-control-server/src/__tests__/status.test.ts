import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { Status } from '../status'

function tmpPath(tag = '') {
  return join(tmpdir(), `test-status-${tag}-${process.pid}-${Date.now()}.json`)
}

describe('Status', () => {
  describe('constructor defaults', () => {
    test('uses defaults when file does not exist', () => {
      const path = tmpPath('new')
      const s = new Status(path)
      expect(s.getValue('brightness')).toBe(0.5)
      expect(s.getValue('transition_time')).toBe(2000)
      expect(s.getValue('running')).toBe(false)
      expect(s.getValue('current_cycle')).toBe('Default')
    })

    test('properties object matches defaults', () => {
      const s = new Status(tmpPath('props'))
      expect(s.properties.brightness).toBe(0.5)
      expect(s.properties.running).toBe(false)
    })
  })

  describe('loading from existing file', () => {
    test('reads existing values from JSON file', () => {
      const path = tmpPath('existing')
      writeFileSync(path, JSON.stringify({ brightness: 0.9, transition_time: 500, running: true, current_cycle: 'Holiday' }))
      const s = new Status(path)
      expect(s.getValue('brightness')).toBe(0.9)
      expect(s.getValue('transition_time')).toBe(500)
      expect(s.getValue('running')).toBe(true)
      expect(s.getValue('current_cycle')).toBe('Holiday')
      unlinkSync(path)
    })

    test('falls back to default for missing keys in partial file', () => {
      const path = tmpPath('partial')
      writeFileSync(path, JSON.stringify({ brightness: 0.8 }))
      const s = new Status(path)
      expect(s.getValue('brightness')).toBe(0.8)
      expect(s.getValue('running')).toBe(false) // default
      expect(s.getValue('current_cycle')).toBe('Default') // default
      unlinkSync(path)
    })
  })

  describe('getValue and setValue', () => {
    test('getValue returns current value', () => {
      const s = new Status(tmpPath('get'))
      expect(s.getValue('brightness')).toBe(0.5)
    })

    test('setValue updates in-memory value immediately', () => {
      const s = new Status(tmpPath('set'))
      s.setValue('brightness', 0.75)
      expect(s.getValue('brightness')).toBe(0.75)
    })

    test('setValue updates properties object immediately', () => {
      const s = new Status(tmpPath('setprops'))
      s.setValue('current_cycle', 'Holiday')
      expect(s.properties.current_cycle).toBe('Holiday')
    })

    test('multiple setValue calls accumulate', () => {
      const s = new Status(tmpPath('multi'))
      s.setValue('brightness', 0.9)
      s.setValue('running', true)
      s.setValue('current_cycle', 'Summer')
      expect(s.getValue('brightness')).toBe(0.9)
      expect(s.getValue('running')).toBe(true)
      expect(s.getValue('current_cycle')).toBe('Summer')
    })
  })

  describe('file persistence (debounced)', () => {
    test('writes file after 500ms debounce', () => {
      jest.useFakeTimers()
      const path = tmpPath('persist')
      const s = new Status(path)
      s.setValue('brightness', 0.8)
      expect(existsSync(path)).toBe(false) // not yet written (debounced)
      jest.advanceTimersByTime(500)
      expect(existsSync(path)).toBe(true)
      const s2 = new Status(path)
      expect(s2.getValue('brightness')).toBe(0.8)
      jest.useRealTimers()
      if (existsSync(path)) unlinkSync(path)
    })

    test('debounce resets on rapid successive calls — only one write happens', () => {
      jest.useFakeTimers()
      const path = tmpPath('debounce')
      const s = new Status(path)
      s.setValue('brightness', 0.1)
      jest.advanceTimersByTime(300)
      s.setValue('brightness', 0.9) // resets timer
      jest.advanceTimersByTime(300)
      expect(existsSync(path)).toBe(false) // still within 500ms of last setValue
      jest.advanceTimersByTime(200)
      expect(existsSync(path)).toBe(true)
      const s2 = new Status(path)
      expect(s2.getValue('brightness')).toBe(0.9) // last value wins
      jest.useRealTimers()
      if (existsSync(path)) unlinkSync(path)
    })
  })
})
