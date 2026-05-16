import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { Cycle } from '../cycle'

function writeTmp(data: object): string {
  const path = join(tmpdir(), `test-cycle-${process.pid}-${Date.now()}.json`)
  writeFileSync(path, JSON.stringify(data))
  return path
}

describe('Cycle', () => {
  test('reads name from JSON file', () => {
    const path = writeTmp({ name: 'Default', cycles: [] })
    const cycle = new Cycle(path)
    expect(cycle.name).toBe('Default')
    unlinkSync(path)
  })

  test('reads cycles array from JSON file', () => {
    const entry = { algorithm: 'rainbow', seconds_in_cycle: 600, options: { speed: 60, reverse: false } }
    const path = writeTmp({ name: 'Test', cycles: [entry] })
    const cycle = new Cycle(path)
    expect(cycle.cycles).toHaveLength(1)
    expect(cycle.cycles[0].algorithm).toBe('rainbow')
    expect(cycle.cycles[0].seconds_in_cycle).toBe(600)
    expect(cycle.cycles[0].options).toEqual({ speed: 60, reverse: false })
    unlinkSync(path)
  })

  test('handles multiple cycle entries', () => {
    const entries = [
      { algorithm: 'twinkles', seconds_in_cycle: 600, options: {} },
      { algorithm: 'lightning', seconds_in_cycle: 300, options: {} },
    ]
    const path = writeTmp({ name: 'Multi', cycles: entries })
    const cycle = new Cycle(path)
    expect(cycle.cycles).toHaveLength(2)
    expect(cycle.cycles[0].algorithm).toBe('twinkles')
    expect(cycle.cycles[1].algorithm).toBe('lightning')
    unlinkSync(path)
  })

  test('handles empty cycles array', () => {
    const path = writeTmp({ name: 'Empty', cycles: [] })
    const cycle = new Cycle(path)
    expect(cycle.cycles).toHaveLength(0)
    unlinkSync(path)
  })

  test('throws when file does not exist', () => {
    expect(() => new Cycle('/nonexistent/path.json')).toThrow()
  })
})
