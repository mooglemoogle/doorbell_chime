import { WebSocketServer, WebSocket } from 'ws'
import { StripRegistry, StripRegistryEntry } from '../strips/registry'
import { StripManager } from '../strips/manager'
import logger from '../logger'

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
  onStripConnected: (stripId: string) => void,
): WebSocketServer {
  const wss = new WebSocketServer({ port })

  wss.on('listening', () => {
    logger.info('Strip WebSocket server listening', { port })
  })

  wss.on('connection', (socket: WebSocket) => {
    let registeredId: string | null = null
    logger.info('Strip client connected (awaiting registration)')

    socket.on('message', (data) => {
      if (typeof data === 'string' || Buffer.isBuffer(data)) {
        const text = typeof data === 'string' ? data : data.toString('utf-8')
        let msg: StripMessage
        try {
          msg = JSON.parse(text) as StripMessage
        } catch {
          logger.warn('Strip sent invalid JSON', { data: text })
          return
        }

        if (msg.type === 'register') {
          const { stripId, config } = msg
          if (!config || !stripId) {
            logger.warn('Strip register message missing stripId or config')
            socket.close()
            return
          }

          const layoutChanged = registry.registerStrip({ stripId, ...config })
          const meta = registry.getStrip(stripId)!
          registeredId = stripId
          manager.register(stripId, socket, meta)

          logger.info('Strip registered', {
            stripId,
            numPixels: config.numPixels,
            bpp: config.bpp,
            layoutChanged,
          })

          if (layoutChanged) onLayoutChange()
          else onStripConnected(stripId)
        } else if (msg.type === 'status' && registeredId) {
          manager.updateStatus(registeredId, msg.bufferedFrames)
        }
      }
    })

    socket.on('close', () => {
      if (registeredId) {
        logger.info('Strip disconnected', { stripId: registeredId })
        manager.remove(registeredId)
      }
    })

    socket.on('error', (err) => {
      logger.error('Strip socket error', { stripId: registeredId ?? 'unregistered', error: err.message })
    })
  })

  return wss
}
