import { WebSocketServer, WebSocket } from 'ws'
import { StripRegistry, StripRegistryEntry } from '../strips/registry'
import { StripManager } from '../strips/manager'

interface RegisterMessage {
  type: 'register'
  stripId: string
  config: Omit<StripRegistryEntry, 'stripId'>
}

interface StatusMessage {
  type: 'status'
  bufferedFrames: number
  lastApplied?: string
}

type StripMessage = RegisterMessage | StatusMessage

export function createStripWebSocketServer(
  port: number,
  registry: StripRegistry,
  manager: StripManager,
  onLayoutChange: () => void,
): WebSocketServer {
  const wss = new WebSocketServer({ port })

  wss.on('listening', () => {
    console.log(`Strip WebSocket server listening on port ${port}`)
  })

  wss.on('connection', (socket: WebSocket) => {
    let registeredId: string | null = null

    socket.on('message', (data) => {
      if (typeof data === 'string' || Buffer.isBuffer(data)) {
        const text = typeof data === 'string' ? data : data.toString('utf-8')
        let msg: StripMessage
        try {
          msg = JSON.parse(text) as StripMessage
        } catch {
          console.warn('Strip sent invalid JSON:', text)
          return
        }

        if (msg.type === 'register') {
          const { stripId, config } = msg
          if (!config || !stripId) {
            console.warn('Strip register message missing stripId or config')
            socket.close()
            return
          }

          const layoutChanged = registry.registerStrip({ stripId, ...config })
          const meta = registry.getStrip(stripId)!
          registeredId = stripId
          manager.register(stripId, socket, meta)

          if (layoutChanged) onLayoutChange()
        } else if (msg.type === 'status' && registeredId) {
          manager.updateStatus(registeredId, msg.bufferedFrames)
        }
      }
    })

    socket.on('close', () => {
      if (registeredId) manager.remove(registeredId)
    })

    socket.on('error', (err) => {
      console.error(`Strip socket error (${registeredId ?? 'unregistered'}):`, err.message)
    })
  })

  return wss
}
