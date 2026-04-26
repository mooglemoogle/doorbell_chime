import { config } from 'dotenv'
config()

import { loadStripConfig } from './stripConfig.js'
import { FrameBuffer } from './frameBuffer.js'
import { ServerClient } from './serverClient.js'
import { LightStrip } from './lightStrip.js'

const stripConfig = loadStripConfig()
const numPixels = Math.abs(stripConfig.hardware.index_end - stripConfig.hardware.index_start) + 1
const buffer = new FrameBuffer()
const strip = new LightStrip(stripConfig.hardware)
const client = new ServerClient(
  stripConfig.server,
  stripConfig.stripId,
  numPixels,
  stripConfig.hardware.bpp,
  stripConfig.physical,
  buffer,
)

await strip.initialize()

process.on('SIGINT', () => {
  client.destroy()
  process.exit(0)
})

client.connect()

// Frame application loop: poll at the current fps, apply buffered frames on time
function applyLoop(): void {
  const frame = buffer.getFrame(Date.now())
  if (frame) strip.applyFrame(frame)
  setTimeout(applyLoop, 1000 / buffer.fps)
}

applyLoop()
