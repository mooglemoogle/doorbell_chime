import { hsvToRgb } from './helpers'

export class Pixel {
  hue: number
  sat: number
  val: number
  white: number

  constructor(hue = 0, sat = 0, val = 0, white = 0) {
    this.hue = hue
    this.sat = sat
    this.val = val
    this.white = white
  }

  set(hue: number, sat: number, val: number, white = 0): void {
    this.hue = hue
    this.sat = sat
    this.val = val
    this.white = white
  }

  clear(): void {
    this.set(0, 0, 0, 0)
  }

  multiply(value: number): Pixel {
    return new Pixel(this.hue, this.sat, this.val * value, this.white * value)
  }

  diff(other: Pixel): Pixel {
    return new Pixel(
      this.hue - other.hue,
      this.sat - other.sat,
      this.val - other.val,
      this.white - other.white,
    )
  }

  combineWith(other: Pixel): void {
    const myRgb = this.getRawRgb()
    const otherRgb = other.getRawRgb()
    const r = Math.min(myRgb[0] + otherRgb[0], 1.0)
    const g = Math.min(myRgb[1] + otherRgb[1], 1.0)
    const b = Math.min(myRgb[2] + otherRgb[2], 1.0)
    this.fromRgb(r, g, b)
  }

  fromRgb(r: number, g: number, b: number): void {
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min

    let hue = 0
    if (delta !== 0) {
      if (max === r) hue = ((g - b) / delta) % 6
      else if (max === g) hue = (b - r) / delta + 2
      else hue = (r - g) / delta + 4
      hue /= 6
      if (hue < 0) hue += 1
    }

    this.hue = hue
    this.sat = max === 0 ? 0 : delta / max
    this.val = max
  }

  getRawRgb(): [number, number, number] {
    return hsvToRgb(this.hue, this.sat, this.val)
  }

  getRgb(brightness: number): [number, number, number] {
    const [r, g, b] = hsvToRgb(this.hue, this.sat, this.val * brightness)
    return [r * 255, g * 255, b * 255]
  }

  getRgbw(brightness: number): [number, number, number, number] {
    const [r, g, b] = this.getRgb(brightness)
    return [r, g, b, this.white * 255 * brightness]
  }
}
