import { AlgorithmConfig } from '../_meta/index'

export const config: AlgorithmConfig = {
  name: 'Two Color Wave',
  options: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      colors: {
        title: 'Colors',
        type: 'array',
        items: { type: 'color' },
        minItems: 2,
        maxItems: 2,
      },
      wavelength: { title: 'Wavelength', type: 'integer', default: 20 },
      speed: { title: 'Seconds per cycle (higher is slower)', type: 'float', default: 2 },
      reverse: { title: 'Reverse', type: 'boolean', default: false },
      split: { title: 'Split', type: 'boolean', default: false },
      square: { title: 'Use Square Wave', type: 'boolean', default: false },
    },
    default: { speed: 100, reverse: true, square: false },
  },
  refresh_rate: 60,
}
