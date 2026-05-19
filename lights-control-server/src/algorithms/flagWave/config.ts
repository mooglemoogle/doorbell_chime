import { AlgorithmConfig } from '../_meta/index'

export const config: AlgorithmConfig = {
  name: 'Waving Flag',
  options: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      flag_parts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            color: { title: 'Color', type: 'color' },
            parts: { type: 'integer', default: 1, min: 1 },
          },
          required: ['color'],
        },
        minItems: 2,
      },
    },
  },
  refresh_rate: 60,
}
