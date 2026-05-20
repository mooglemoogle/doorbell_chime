import { homedir } from 'os'
import { join } from 'path'

export const DATA_DIR = process.env.LIGHTS_DATA_DIR ?? join(homedir(), '.local', 'lights-control')
