import { BaseAlgorithm, AlgorithmConfig } from './_meta/index'

export const config: AlgorithmConfig = {
  name: 'Single Color',
  options: {
    color: {
      title: 'Color (HSV)',
      type: 'array',
      minItems: 3,
      maxItems: 4,
      items: { type: 'number', inclusiveMinimum: 0.0, inclusiveMaximum: 1.0 },
    },
  },
  refresh_rate: 2,
}

export class Algorithm extends BaseAlgorithm {
  constructor(numPixels: number, settings: Record<string, unknown>) {
    super(numPixels, config, settings)
    const color = settings['color'] as number[]
    for (const pixel of this.pixels) {
      pixel.set(color[0], color[1], color[2], color[3] ?? 0)
    }
  }
}
