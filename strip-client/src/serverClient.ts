import WebSocket from 'ws'
import { ServerConfig, PhysicalConfig } from './stripConfig.js'
import { FrameBuffer, parseServerMessage } from './frameBuffer.js'

const RECONNECT_INITIAL_MS = 1000
const RECONNECT_MAX_MS = 30000
const STATUS_INTERVAL_MS = 5000

export class ServerClient {
  private ws: WebSocket | null = null
  private reconnectDelay = RECONNECT_INITIAL_MS
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private statusTimer: ReturnType<typeof setInterval> | null = null
  private destroyed = false

  constructor(
    private readonly config: ServerConfig,
    private readonly stripId: string,
    private readonly numPixels: number,
    private readonly bpp: 3 | 4,
    private readonly physical: PhysicalConfig,
    private readonly buffer: FrameBuffer,
  ) {}

  connect(): void {
    const url = `ws://${this.config.host}:${this.config.wsPort}`
    console.log(`Connecting to ${url}...`)

    this.ws = new WebSocket(url)
    this.ws.binaryType = 'nodebuffer'

    this.ws.on('open', () => {
      console.log('Connected to server')
      this.reconnectDelay = RECONNECT_INITIAL_MS
      this.register()
      this.startStatusHeartbeat()
    })

    this.ws.on('message', (data: WebSocket.RawData) => {
      parseServerMessage(data as Buffer, this.buffer)
    })

    this.ws.on('close', () => {
      console.log('Disconnected from server')
      this.stopStatusHeartbeat()
      if (!this.destroyed) this.scheduleReconnect()
    })

    this.ws.on('error', (err) => {
      console.error('WebSocket error:', err.message)
      // 'close' will fire after error, triggering reconnect
    })
  }

  destroy(): void {
    this.destroyed = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.stopStatusHeartbeat()
    this.ws?.close()
  }

  private register(): void {
    this.send({
      type: 'register',
      stripId: this.stripId,
      config: {
        numPixels: this.numPixels,
        bpp: this.bpp,
        physical: this.physical,
      },
    })
  }

  private startStatusHeartbeat(): void {
    this.statusTimer = setInterval(() => {
      this.send({
        type: 'status',
        bufferedFrames: this.buffer.bufferedCount(),
        lastApplied: new Date().toISOString(),
      })
    }, STATUS_INTERVAL_MS)
  }

  private stopStatusHeartbeat(): void {
    if (this.statusTimer) {
      clearInterval(this.statusTimer)
      this.statusTimer = null
    }
  }

  private send(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  private scheduleReconnect(): void {
    console.log(`Reconnecting in ${this.reconnectDelay}ms...`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, this.reconnectDelay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS)
  }
}
