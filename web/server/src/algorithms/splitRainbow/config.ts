import { AlgorithmConfig } from '../_meta/index'

export const config: AlgorithmConfig = {
  name: 'Split Rainbow',
  options: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      speed: { title: 'Speed (º per second)', type: 'integer', default: 100, minimum: 1, maximum: 720 },
      reverse: { title: 'Reverse', type: 'boolean', default: false },
    },
    default: { speed: 100, reverse: false },
  },
  refresh_rate: 60,
}
