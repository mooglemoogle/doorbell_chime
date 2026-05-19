import { WebSocket } from 'ws'
import { ResolvedStrip } from './registry'

export interface ConnectedStrip {
  stripId: string
  socket: WebSocket
  meta: ResolvedStrip
  bufferedFrames: number
  lastSeen: number
}

export class StripManager {
  private connections = new Map<string, ConnectedStrip>()
  private disabledIds = new Set<string>()

  register(stripId: string, socket: WebSocket, meta: ResolvedStrip): void {
    this.connections.set(stripId, {
      stripId,
      socket,
      meta,
      bufferedFrames: 0,
      lastSeen: Date.now(),
    })
    console.log(`Strip connected: ${stripId} (${meta.numPixels}px @ offset ${meta.pixelOffset})`)
  }

  remove(stripId: string): void {
    this.connections.delete(stripId)
    console.log(`Strip disconnected: ${stripId}`)
  }

  disconnect(stripId: string): void {
    const conn = this.connections.get(stripId)
    if (conn) conn.socket.close()
    this.remove(stripId)
  }

  disable(stripId: string): void { this.disabledIds.add(stripId) }
  enable(stripId: string): void { this.disabledIds.delete(stripId) }
  isDisabled(stripId: string): boolean { return this.disabledIds.has(stripId) }

  updateStatus(stripId: string, bufferedFrames: number): void {
    const conn = this.connections.get(stripId)
    if (conn) {
      conn.bufferedFrames = bufferedFrames
      conn.lastSeen = Date.now()
    }
  }

  getConnected(): ConnectedStrip[] {
    return Array.from(this.connections.values())
  }

  send(stripId: string, data: Buffer): void {
    const conn = this.connections.get(stripId)
    if (conn && conn.socket.readyState === WebSocket.OPEN) {
      conn.socket.send(data)
    }
  }

  broadcast(data: Buffer): void {
    for (const conn of this.connections.values()) {
      if (conn.socket.readyState === WebSocket.OPEN) {
        conn.socket.send(data)
      }
    }
  }
}
