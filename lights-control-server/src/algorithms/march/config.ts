import { AlgorithmConfig } from '../_meta/index'

export const config: AlgorithmConfig = {
  name: 'March',
  options: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      colors: {
        title: 'Colors',
        type: 'array',
        items: { type: 'color' },
        minItems: 1,
      },
      freq: { title: 'Step Frequency (seconds)', type: 'number', default: 2, minimum: 0 },
    },
    default: {
      colors: [
        [0.333, 0.929, 0.663],
        [0, 0.937, 0.808],
        [0.142, 1.0, 1.0],
        [0.677, 0.833, 0.871],
      ],
      freq: 2.0,
    },
  },
  refresh_rate: 10,
}
