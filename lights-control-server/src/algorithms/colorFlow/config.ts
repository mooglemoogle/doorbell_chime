import { AlgorithmConfig } from '../_meta/index'

export const config: AlgorithmConfig = {
  name: 'Color Flow',
  options: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      colors: {
        title: 'Colors',
        type: 'array',
        items: { type: 'color' },
        minItems: 2,
      },
      width: {
        title: 'Solid Width (pixels)',
        type: 'integer',
        default: 10,
        minimum: 1,
      },
      blend_width: {
        title: 'Blend Width (pixels)',
        type: 'integer',
        default: 5,
        minimum: 0,
      },
      speed: {
        title: 'Speed (pixels per second)',
        type: 'number',
        default: 20,
        minimum: 0,
      },
    },
    default: {
      colors: [[0, 1, 1], [0.333, 1, 1], [0.667, 1, 1]],
      width: 10,
      blend_width: 5,
      speed: 20,
    },
  },
  refresh_rate: 60,
}
