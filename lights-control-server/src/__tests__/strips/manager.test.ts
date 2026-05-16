import { WebSocket } from 'ws'
import { StripManager } from '../../strips/manager'
import { ResolvedStrip } from '../../strips/registry'

function makeSocket(readyState: number = WebSocket.OPEN): WebSocket {
  return { readyState, send: jest.fn() } as unknown as WebSocket
}

function makeMeta(id: string, numPixels = 10, pixelOffset = 0): ResolvedStrip {
  return {
    stripId: id,
    numPixels,
    bpp: 3,
    pixelOffset,
    physical: {
      length_meters: 1,
      location: { start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 } },
    },
  }
}

describe('StripManager', () => {
  let manager: StripManager

  beforeEach(() => {
    manager = new StripManager()
  })

  describe('register', () => {
    test('adds a connection retrievable via getConnected()', () => {
      const socket = makeSocket()
      manager.register('strip-a', socket, makeMeta('strip-a'))
      expect(manager.getConnected()).toHaveLength(1)
      expect(manager.getConnected()[0].stripId).toBe('strip-a')
    })

    test('stores socket and meta on the connection', () => {
      const socket = makeSocket()
      const meta = makeMeta('strip-a', 30, 0)
      manager.register('strip-a', socket, meta)
      const conn = manager.getConnected()[0]
      expect(conn.socket).toBe(socket)
      expect(conn.meta).toBe(meta)
    })

    test('initializes bufferedFrames to 0', () => {
      manager.register('strip-a', makeSocket(), makeMeta('strip-a'))
      expect(manager.getConnected()[0].bufferedFrames).toBe(0)
    })

    test('overwrites existing connection with same stripId', () => {
      const socket1 = makeSocket()
      const socket2 = makeSocket()
      manager.register('strip-a', socket1, makeMeta('strip-a'))
      manager.register('strip-a', socket2, makeMeta('strip-a'))
      expect(manager.getConnected()).toHaveLength(1)
      expect(manager.getConnected()[0].socket).toBe(socket2)
    })
  })

  describe('remove', () => {
    test('removes the connection', () => {
      manager.register('strip-a', makeSocket(), makeMeta('strip-a'))
      manager.remove('strip-a')
      expect(manager.getConnected()).toHaveLength(0)
    })

    test('does not throw for unknown stripId', () => {
      expect(() => manager.remove('nonexistent')).not.toThrow()
    })
  })

  describe('updateStatus', () => {
    test('updates bufferedFrames for known strip', () => {
      manager.register('strip-a', makeSocket(), makeMeta('strip-a'))
      manager.updateStatus('strip-a', 42)
      expect(manager.getConnected()[0].bufferedFrames).toBe(42)
    })

    test('updates lastSeen for known strip', () => {
      jest.spyOn(Date, 'now').mockReturnValue(99999)
      manager.register('strip-a', makeSocket(), makeMeta('strip-a'))
      manager.updateStatus('strip-a', 5)
      expect(manager.getConnected()[0].lastSeen).toBe(99999)
      jest.restoreAllMocks()
    })

    test('does not throw for unknown stripId', () => {
      expect(() => manager.updateStatus('nonexistent', 5)).not.toThrow()
    })
  })

  describe('getConnected', () => {
    test('returns empty array when no strips registered', () => {
      expect(manager.getConnected()).toEqual([])
    })

    test('returns all registered connections', () => {
      manager.register('strip-a', makeSocket(), makeMeta('strip-a'))
      manager.register('strip-b', makeSocket(), makeMeta('strip-b'))
      const ids = manager.getConnected().map(c => c.stripId).sort()
      expect(ids).toEqual(['strip-a', 'strip-b'])
    })
  })

  describe('send', () => {
    test('sends data when socket is OPEN', () => {
      const socket = makeSocket(WebSocket.OPEN)
      manager.register('strip-a', socket, makeMeta('strip-a'))
      const data = Buffer.from([1, 2, 3])
      manager.send('strip-a', data)
      expect(socket.send).toHaveBeenCalledWith(data)
    })

    test('does not send when socket is not OPEN', () => {
      const socket = makeSocket(WebSocket.CLOSED)
      manager.register('strip-a', socket, makeMeta('strip-a'))
      manager.send('strip-a', Buffer.from([1]))
      expect(socket.send).not.toHaveBeenCalled()
    })

    test('does nothing for unknown stripId', () => {
      expect(() => manager.send('nonexistent', Buffer.from([1]))).not.toThrow()
    })
  })

  describe('broadcast', () => {
    test('sends to all OPEN sockets', () => {
      const s1 = makeSocket(WebSocket.OPEN)
      const s2 = makeSocket(WebSocket.OPEN)
      manager.register('a', s1, makeMeta('a'))
      manager.register('b', s2, makeMeta('b'))
      const data = Buffer.from([0x02, 1, 2])
      manager.broadcast(data)
      expect(s1.send).toHaveBeenCalledWith(data)
      expect(s2.send).toHaveBeenCalledWith(data)
    })

    test('skips sockets that are not OPEN', () => {
      const open = makeSocket(WebSocket.OPEN)
      const closed = makeSocket(WebSocket.CLOSED)
      manager.register('open', open, makeMeta('open'))
      manager.register('closed', closed, makeMeta('closed'))
      manager.broadcast(Buffer.from([1]))
      expect(open.send).toHaveBeenCalled()
      expect(closed.send).not.toHaveBeenCalled()
    })

    test('does nothing when no strips are connected', () => {
      expect(() => manager.broadcast(Buffer.from([1]))).not.toThrow()
    })
  })
})
