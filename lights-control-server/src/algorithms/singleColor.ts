import { BaseAlgorithm, AlgorithmConfig } from './_meta/index'

export const config: AlgorithmConfig = {
  name: 'Single Color',
  options: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      color: {
        title: 'Color',
        type: 'color',
      },
    },
    default: { color: [0, 0, 1] },
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
