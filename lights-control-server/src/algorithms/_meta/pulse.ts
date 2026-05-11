import { Pixel } from './pixel'
import { bezierBlend } from './helpers'

export class Pulse {
  location: number
  color: Pixel
  size: number
  dropOffRight: number
  dropOffLeft: number

  constructor(
    location: number,
    color: Pixel,
    size: number,
    dropOffRight: number,
    dropOffLeft: number,
  ) {
    this.location = location
    this.color = color
    this.size = size
    this.dropOffRight = dropOffRight
    this.dropOffLeft = dropOffLeft
  }

  applyPulse(pixels: Pixel[]): void {
    const mainBound = this.size / 2.0
    const leftBound = Math.max(Math.floor(this.location - mainBound - this.dropOffLeft), 0)
    const rightBound = Math.min(
      Math.ceil(this.location + mainBound + this.dropOffRight),
      pixels.length - 1,
    )

    for (let n = leftBound; n <= rightBound; n++) {
      const pixel = pixels[n]
      if (n <= this.location) {
        if (n >= this.location - mainBound) {
          pixel.combineWith(this.color)
        } else {
          const distance = this.location - mainBound - n
          const percentage = Math.max(1 - distance / this.dropOffLeft, 0)
          pixel.combineWith(this.color.multiply(bezierBlend(percentage)))
        }
      } else {
        if (n <= this.location + mainBound) {
          pixel.combineWith(this.color)
        } else {
          const distance = n - this.location - mainBound
          const percentage = Math.max(1 - distance / this.dropOffRight, 0)
          pixel.combineWith(this.color.multiply(bezierBlend(percentage)))
        }
      }
    }
  }
}
