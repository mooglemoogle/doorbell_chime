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

// Frame application loop: deadline-based timing so work time doesn't accumulate
let nextFrame = Date.now()

function applyLoop(): void {
  const frame = buffer.getFrame(Date.now())
  if (frame) strip.applyFrame(frame)
  nextFrame += 1000 / buffer.fps
  const delay = nextFrame - Date.now()
  if (delay > 0) {
    setTimeout(applyLoop, delay)
  } else {
    nextFrame = Date.now()
    setTimeout(applyLoop, 0)
  }
}

applyLoop()
