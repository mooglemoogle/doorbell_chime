import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { Cycles } from '../cycles'

function makeTmpDir(tag = ''): string {
  const dir = join(tmpdir(), `test-cycles-${tag}-${process.pid}-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

function writeCycle(dir: string, filename: string, data: object): void {
  writeFileSync(join(dir, filename), JSON.stringify(data))
}

describe('Cycles', () => {
  let dir: string

  beforeEach(() => {
    dir = makeTmpDir()
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  test('throws when directory does not exist', () => {
    expect(() => new Cycles('/nonexistent/cycle/dir')).toThrow()
  })

  test('loads all cycle files from directory', () => {
    writeCycle(dir, 'default.json', { name: 'Default', cycles: [] })
    writeCycle(dir, 'holiday.json', { name: 'Holiday', cycles: [] })
    const cycles = new Cycles(dir)
    expect(cycles.cycles).toHaveLength(2)
    expect(cycles.cycleNames).toContain('Default')
    expect(cycles.cycleNames).toContain('Holiday')
  })

  describe('getCycle', () => {
    test('returns the named cycle when it exists', () => {
      writeCycle(dir, 'default.json', { name: 'Default', cycles: [] })
      writeCycle(dir, 'holiday.json', { name: 'Holiday', cycles: [{ algorithm: 'rainbow', seconds_in_cycle: 60, options: {} }] })
      const cycles = new Cycles(dir)
      const c = cycles.getCycle('Holiday')
      expect(c.name).toBe('Holiday')
      expect(c.cycles).toHaveLength(1)
    })

    test('falls back to Default cycle for unknown name', () => {
      writeCycle(dir, 'default.json', { name: 'Default', cycles: [] })
      const cycles = new Cycles(dir)
      const c = cycles.getCycle('nonexistent')
      expect(c.name).toBe('Default')
    })

    test('falls back to lowercase "default" cycle if "Default" is missing', () => {
      writeCycle(dir, 'default.json', { name: 'default', cycles: [] })
      const cycles = new Cycles(dir)
      const c = cycles.getCycle('nonexistent')
      expect(c.name).toBe('default')
    })

    test('falls back to first cycle if neither Default variant exists', () => {
      writeCycle(dir, 'summer.json', { name: 'Summer', cycles: [] })
      const cycles = new Cycles(dir)
      const c = cycles.getCycle('nonexistent')
      expect(c.name).toBe('Summer')
    })
  })

  describe('reloadCycles', () => {
    test('throws when directory no longer exists or is not a directory', () => {
      writeCycle(dir, 'default.json', { name: 'Default', cycles: [] })
      const cycles = new Cycles(dir)
      rmSync(dir, { recursive: true })
      expect(() => cycles.reloadCycles()).toThrow()
    })
  })
})
