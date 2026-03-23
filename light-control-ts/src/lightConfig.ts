import { readFileSync, existsSync } from 'fs'

export interface LightStripConfig {
  index_start: number
  index_end: number
  gpio_pin: number
  bpp: 3 | 4
  order: string
  skip: number[]
}

export class LightConfig {
  lightStrips: LightStripConfig[] = []

  constructor(lightConfigFilePath = './light_config.json') {
    if (!existsSync(lightConfigFilePath)) {
      throw new Error(
        'Light Strip config required at light_config.json. See light_config_sample.json for an example',
      )
    }
    const data = JSON.parse(readFileSync(lightConfigFilePath, 'utf-8')) as {
      light_strips: LightStripConfig[]
    }
    this.lightStrips = data.light_strips
  }
}
