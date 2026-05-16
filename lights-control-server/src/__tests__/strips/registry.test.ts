import { mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { StripRegistry, StripRegistryEntry } from '../../strips/registry'

function makeTmpPath(): string {
  const dir = join(tmpdir(), `test-registry-${process.pid}-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return join(dir, 'strips_config.json')
}

function makeEntry(id: string, numPixels: number, x: number, y = 0, z = 0, bpp: 3 | 4 = 3): StripRegistryEntry {
  return {
    stripId: id,
    numPixels,
    bpp,
    physical: {
      length_meters: 1,
      location: {
        start: { x, y, z },
        end: { x: x + 1, y, z },
      },
    },
  }
}

describe('StripRegistry', () => {
  let savePath: string

  beforeEach(() => {
    savePath = makeTmpPath()
  })

  afterEach(() => {
    rmSync(join(savePath, '..'), { recursive: true, force: true })
  })

  describe('constructor', () => {
    test('starts with zero pixels when no file exists', () => {
      const registry = new StripRegistry(savePath)
      expect(registry.totalPixels).toBe(0)
      expect(registry.strips).toHaveLength(0)
    })
  })

  describe('registerStrip', () => {
    test('returns true when totalPixels changes', () => {
      const registry = new StripRegistry(savePath)
      const changed = registry.registerStrip(makeEntry('strip-a', 30, 0))
      expect(changed).toBe(true)
    })

    test('returns false when totalPixels is unchanged', () => {
      const registry = new StripRegistry(savePath)
      registry.registerStrip(makeEntry('strip-a', 30, 0))
      // Re-register same strip with same pixel count
      const changed = registry.registerStrip(makeEntry('strip-a', 30, 0))
      expect(changed).toBe(false)
    })

    test('returns true when pixel count changes for existing strip', () => {
      const registry = new StripRegistry(savePath)
      registry.registerStrip(makeEntry('strip-a', 30, 0))
      const changed = registry.registerStrip(makeEntry('strip-a', 60, 0))
      expect(changed).toBe(true)
      expect(registry.totalPixels).toBe(60)
    })

    test('accumulates totalPixels across multiple strips', () => {
      const registry = new StripRegistry(savePath)
      registry.registerStrip(makeEntry('strip-a', 30, 0))
      registry.registerStrip(makeEntry('strip-b', 60, 1))
      expect(registry.totalPixels).toBe(90)
    })
  })

  describe('strip ordering and pixel offsets', () => {
    test('sorts strips by start.x ascending', () => {
      const registry = new StripRegistry(savePath)
      registry.registerStrip(makeEntry('strip-b', 20, 2))
      registry.registerStrip(makeEntry('strip-a', 10, 0))
      registry.registerStrip(makeEntry('strip-c', 30, 5))
      expect(registry.strips[0].stripId).toBe('strip-a')
      expect(registry.strips[1].stripId).toBe('strip-b')
      expect(registry.strips[2].stripId).toBe('strip-c')
    })

    test('sorts by start.y when x is equal', () => {
      const registry = new StripRegistry(savePath)
      registry.registerStrip(makeEntry('strip-high', 10, 0, 3))
      registry.registerStrip(makeEntry('strip-low', 10, 0, 1))
      expect(registry.strips[0].stripId).toBe('strip-low')
      expect(registry.strips[1].stripId).toBe('strip-high')
    })

    test('sorts by start.z when x and y are equal', () => {
      const registry = new StripRegistry(savePath)
      registry.registerStrip(makeEntry('strip-back', 10, 0, 0, 2))
      registry.registerStrip(makeEntry('strip-front', 10, 0, 0, 0))
      expect(registry.strips[0].stripId).toBe('strip-front')
      expect(registry.strips[1].stripId).toBe('strip-back')
    })

    test('assigns correct pixel offsets in order', () => {
      const registry = new StripRegistry(savePath)
      registry.registerStrip(makeEntry('strip-a', 10, 0))
      registry.registerStrip(makeEntry('strip-b', 20, 1))
      registry.registerStrip(makeEntry('strip-c', 30, 2))
      expect(registry.strips[0].pixelOffset).toBe(0)   // strip-a starts at 0
      expect(registry.strips[1].pixelOffset).toBe(10)  // strip-b starts after 10
      expect(registry.strips[2].pixelOffset).toBe(30)  // strip-c starts after 10+20
    })

    test('single strip has pixelOffset of 0', () => {
      const registry = new StripRegistry(savePath)
      registry.registerStrip(makeEntry('only', 50, 0))
      expect(registry.strips[0].pixelOffset).toBe(0)
    })
  })

  describe('getStrip', () => {
    test('returns the resolved strip for a known stripId', () => {
      const registry = new StripRegistry(savePath)
      registry.registerStrip(makeEntry('strip-a', 30, 0))
      const strip = registry.getStrip('strip-a')
      expect(strip).toBeDefined()
      expect(strip!.stripId).toBe('strip-a')
      expect(strip!.numPixels).toBe(30)
      expect(strip!.pixelOffset).toBe(0)
    })

    test('returns undefined for unknown stripId', () => {
      const registry = new StripRegistry(savePath)
      expect(registry.getStrip('nonexistent')).toBeUndefined()
    })
  })
})
