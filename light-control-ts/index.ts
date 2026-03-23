import './src/env.js'
import { Timer } from './src/timer.js'
import { Runner } from './src/runner.js'

const timer = new Timer(60)
const runner = new Runner()

process.on('SIGINT', () => {
  runner.destroy()
  process.exit(0)
})

// FPS-locked main loop
while (true) {
  timer.updateFps(runner.refreshRate())
  await runner.runCycle()
  await timer.sleep()
}
