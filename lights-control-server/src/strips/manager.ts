import { WebSocket } from 'ws'
import { ResolvedStrip } from './registry'

export interface StripReportedStats {
  framesApplied: number
  underruns: number
  drops: number
  processUptimeSecs: number
  targetFps: number
  measuredFps?: number
  avgLatencyMs?: number
  avgFrameIntervalMs?: number
}

export interface ConnectedStrip {
  stripId: string
  socket: WebSocket
  meta: ResolvedStrip
  bufferedFrames: number
  lastSeen: number
  connectedAt: number
  framesSent: number
  framesBaseline: number
  framesBaselineTime: number
  minBuffer: number
  maxBuffer: number
  reportedStats: StripReportedStats | null
}

export interface StripMetrics {
  connectedAt: number
  uptimeMs: number
  avgFpsSent: number
  minBuffer: number
  maxBuffer: number
  reported: StripReportedStats | null
}

export class StripManager {
  private connections = new Map<string, ConnectedStrip>()
  private disabledIds = new Set<string>()
  private uptimeAccumulator = new Map<string, number>()

  register(stripId: string, socket: WebSocket, meta: ResolvedStrip): void {
    const now = Date.now()
    this.connections.set(stripId, {
      stripId,
      socket,
      meta,
      bufferedFrames: 0,
      lastSeen: now,
      connectedAt: now,
      framesSent: 0,
      framesBaseline: 0,
      framesBaselineTime: now,
      minBuffer: 0,
      maxBuffer: 0,
      reportedStats: null,
    })
    console.log(`Strip connected: ${stripId} (${meta.numPixels}px @ offset ${meta.pixelOffset})`)
  }

  remove(stripId: string): void {
    const conn = this.connections.get(stripId)
    if (conn) {
      const prev = this.uptimeAccumulator.get(stripId) ?? 0
      this.uptimeAccumulator.set(stripId, prev + (Date.now() - conn.connectedAt))
    }
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

  updateStatus(stripId: string, bufferedFrames: number, reported?: Partial<StripReportedStats>): void {
    const conn = this.connections.get(stripId)
    if (conn) {
      conn.bufferedFrames = bufferedFrames
      conn.lastSeen = Date.now()
      conn.minBuffer = Math.min(conn.minBuffer, bufferedFrames)
      conn.maxBuffer = Math.max(conn.maxBuffer, bufferedFrames)
      if (reported) {
        conn.reportedStats = {
          framesApplied: reported.framesApplied ?? 0,
          underruns: reported.underruns ?? 0,
          drops: reported.drops ?? 0,
          processUptimeSecs: reported.processUptimeSecs ?? 0,
          targetFps: reported.targetFps ?? 0,
          measuredFps: reported.measuredFps,
          avgLatencyMs: reported.avgLatencyMs,
          avgFrameIntervalMs: reported.avgFrameIntervalMs,
        }
      }
    }
  }

  /** Returns metrics for a connected strip and resets the FPS/buffer window. */
  snapshotMetrics(stripId: string): StripMetrics | null {
    const conn = this.connections.get(stripId)
    if (!conn) return null

    const now = Date.now()
    const elapsed = (now - conn.framesBaselineTime) / 1000
    const avgFps = elapsed > 0.1 ? (conn.framesSent - conn.framesBaseline) / elapsed : 0

    const snapshot: StripMetrics = {
      connectedAt: conn.connectedAt,
      uptimeMs: (this.uptimeAccumulator.get(stripId) ?? 0) + (now - conn.connectedAt),
      avgFpsSent: avgFps,
      minBuffer: conn.minBuffer,
      maxBuffer: conn.maxBuffer,
      reported: conn.reportedStats,
    }

    conn.framesBaseline = conn.framesSent
    conn.framesBaselineTime = now
    conn.minBuffer = conn.bufferedFrames
    conn.maxBuffer = conn.bufferedFrames

    return snapshot
  }

  getConnected(): ConnectedStrip[] {
    return Array.from(this.connections.values())
  }

  send(stripId: string, data: Buffer): void {
    const conn = this.connections.get(stripId)
    if (conn && conn.socket.readyState === WebSocket.OPEN) {
      conn.socket.send(data)
      conn.framesSent++
    }
  }

  broadcast(data: Buffer): void {
    for (const conn of this.connections.values()) {
      if (conn.socket.readyState === WebSocket.OPEN) {
        conn.socket.send(data)
        conn.framesSent++
      }
    }
  }
}
