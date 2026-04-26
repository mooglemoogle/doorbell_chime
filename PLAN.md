# Distributed Light Strip Architecture — Implementation Plan

## Goal

Refactor the system from a single-Pi monolith into a centrally managed server that pre-computes all pixel data and broadcasts binary frame messages to dumb strip clients running on individual Pis.

---

## Architecture

```
┌─────────────┐   HTTP    ┌──────────────────────────────────────┐
│ React UI    │ ────────► │ Home Server  (web/server/)           │
│ web/client  │           │  - Express REST API                  │
└─────────────┘           │  - Algorithm runner (all logic here) │
                          │  - Frame generator & broadcaster     │
                          │  - Strip registry (static layout)    │
                          └──────────────┬───────────────────────┘
                                         │ WebSocket: binary frame data
                            ┌────────────┼────────────┐
                            ▼            ▼            ▼
                      ┌──────────┐ ┌──────────┐ ┌──────────┐
                      │ Strip A  │ │ Strip B  │ │ Strip C  │
                      │ Pi #1    │ │ Pi #2    │ │ Pi #3    │
                      │  (dumb)  │ │  (dumb)  │ │  (dumb)  │
                      └──────────┘ └──────────┘ └──────────┘
                      strip-client/ — receives frames, drives hardware only
```

---

## Key Design Decisions

### Server computes all pixels
The server runs all algorithms on a single virtual pixel array spanning all strips combined. It applies brightness and converts HSV → RGB. Strips receive final RGB bytes and just drive hardware.

### Per-strip pixel slicing
The server knows each strip's `pixelOffset` and `numPixels` within the global virtual canvas (sorted by physical position). It slices the virtual array and sends each strip only its own pixels.

### Binary frame protocol
High-frequency frame messages are binary for efficiency. Control messages (`register`, `status`, `sync`) are JSON text frames on the same WebSocket connection.

### 1-second lookahead buffer
Server sends frames 1 second ahead of their target display time. Strips buffer up to `fps` frames. On algorithm change, a SYNC message tells the strip to discard buffered frames and switch immediately (limiting command lag to ~1 frame).

---

## Binary Protocol (server → strip)

### Type `0x01` — FRAME

```
Offset  Bytes  Type        Field
0       1      uint8       message type (0x01)
1       8      int64 BE    target timestamp (Unix ms)
9       2      uint16 BE   frame number within second (0 to fps-1)
11      2      uint16 BE   pixel count
13+     n*3    uint8[]     pixel data: R, G, B per pixel
        n*4    uint8[]     ...or R, G, B, W for bpp=4 strips
```

For 90 RGB pixels: 13 + 270 = **283 bytes/frame** (vs ~1,100 bytes JSON — ~4x smaller).
At 30fps, 3 strips of 90px: ~25 KB/s total.

### Type `0x02` — FRAMERATE/SYNC

```
Offset  Bytes  Type        Field
0       1      uint8       message type (0x02)
1       8      int64 BE    effective timestamp (Unix ms)
9       2      uint16 BE   framerate
```

Sent on connect and on algorithm change. Strip discards all buffered frames at or after the effective timestamp. This is the buffer-clear mechanism — command lag is ~1 frame, not 1 second.

### Strip → Server (JSON text frames)

```json
// On connect
{ "type": "register", "stripId": "front-eave-left" }

// Periodic heartbeat
{ "type": "status", "bufferedFrames": 3, "lastApplied": "2026-04-24T15:00:01.033" }
```

---

## Frame Buffer Behavior (on strip)

| Scenario | Behavior |
|---|---|
| Frame arrives on time | Queued, applied at timestamp |
| Frame arrives late | Applied immediately if within 1 frame window; otherwise dropped |
| Buffer underrun (no frame ready) | Hold last applied frame — no flicker |
| Buffer overflow (> fps frames) | Drop oldest — self-healing lag recovery |
| `0x02 SYNC` received | Drop all buffered frames at/after sync timestamp |

Buffer implementation: `Map<timestamp, Uint8Array>` keyed by Unix-ms timestamp. Application loop runs at `fps` Hz via `setTimeout`.

---

## Config Files

### `strip-client/strip_config.json` (on each Pi)

```json
{
  "stripId": "front-eave-left",
  "server": {
    "host": "homeserver.local",
    "wsPort": 3002
  },
  "hardware": {
    "index_start": 0,
    "index_end": 89,
    "gpio_pin": 18,
    "bpp": 3,
    "order": "GRB",
    "skip": []
  }
}
```

Note: physical location lives on the server in `strips_registry.json`, not on the Pi.

### `web/server/strips_registry.json` (on server)

```json
[
  {
    "stripId": "front-eave-left",
    "numPixels": 90,
    "bpp": 3,
    "physical": {
      "length_meters": 5.0,
      "location": {
        "start": { "x": 0.0, "y": 3.5, "z": 0.0 },
        "end":   { "x": 5.0, "y": 3.5, "z": 0.0 }
      }
    }
  }
]
```

Server sorts strips by `location.start.x` (left to right) to assign `pixelOffset` values. Server also knows `bpp` per strip to send 3- or 4-byte pixel data.

---

## Full File Map

### `strip-client/` (new — replaces `light-control-ts/`)

```
src/
  index.ts          — connect to server, start frame application loop
  stripConfig.ts    — load strip_config.json (stripId, server, hardware)
  serverClient.ts   — WS client: connect, register, receive binary frames,
                      exponential backoff reconnect, re-register on reconnect
  frameBuffer.ts    — timestamped frame queue (Map<ms, Uint8Array>),
                      getFrame(adjustedNow), sync(fromTimestamp), eviction
  lightStrip.ts     — simplified from light-control-ts: accepts pre-computed
                      RGB/RGBW Uint8Array, handles skip/reversal/packing,
                      drives piixel hardware
strip_config.json   — stripId + server.host/wsPort + hardware block
package.json
tsconfig.json
```

**Removed vs light-control-ts:** all algorithm code, cycle management, ZMQ, status persistence, HSV→RGB conversion, Pixel class usage.

### `web/server/` (additions and modifications)

```
strips_registry.json          — NEW: all known strips with numPixels, bpp, physical layout

src/
  algorithms/                 — MOVED from light-control-ts/src/algorithms/ (unchanged)
  strips/
    registry.ts               — NEW: load strips_registry.json, sort by physical position,
                                compute pixelOffset per strip
    manager.ts                — NEW: track live WS connections per stripId
  animation/
    runner.ts                 — NEW: algorithm loop (adapted from light-control-ts runner.ts)
                                handles cycle transitions, timing, commands
    frameGenerator.ts         — NEW: after each runCycle(), converts virtual Pixel[] →
                                per-strip Uint8Array slices (HSV→RGB + brightness here),
                                builds 0x01 binary frames, dispatches to connected strips;
                                sends 0x02 SYNC on algorithm change
  websocket/
    server.ts                 — NEW: WS server on port 3002, handles register + status messages
    protocol.ts               — NEW: binary encode/decode helpers (shared types)
  status.ts                   — MOVED from light-control-ts (persists brightness, running, current_cycle)
  cycles.ts                   — MOVED from light-control-ts (loads cycle JSON files)
  routes/
    actions.ts                — MODIFY: commands route to runner (ZMQ removed)
    strips.ts                 — NEW: GET /api/strips — connected strips + buffer health for UI
  index.ts                    — MODIFY: start WS server + animation loop alongside Express
```

### `lights-cli/` (Go)

Replace ZMQ calls with HTTP calls to `web/server`. Same commands (`on`, `off`, `next`, `brightness`, `status`, `cycles`, `set-cycle`) become HTTP requests. Mechanical change — cobra structure unchanged.

### `web/client/`

No changes required initially.

### `light-control-ts/`

Archive/delete once `strip-client/` is validated on hardware.

---

## Implementation Order

1. Move `algorithms/`, `status.ts`, `cycles.ts` from `light-control-ts/` into `web/server/src/`
2. Build `web/server/src/animation/runner.ts` (adapt existing runner — remove ZMQ, wire to local cycle/status)
3. Build `web/server/src/strips/registry.ts` + `strips_registry.json`
4. Build `web/server/src/animation/frameGenerator.ts` + `websocket/server.ts` + `protocol.ts`
5. Build `strip-client/` (config → connect → buffer → apply loop)
6. Wire `web/server/src/routes/actions.ts` to new runner (remove ZMQ dependency from web/server)
7. Update `lights-cli/` (ZMQ → HTTP)
8. Test end-to-end; archive `light-control-ts/`

---

## Open Questions / Future Work

- Physical ordering strategy for non-linear layouts (strips that wrap corners or go vertical)
- Binary encoding for strip → server messages if status heartbeats become high-frequency
- Web UI enhancements: visual strip map using physical coordinates from `strips_registry.json`
- Per-strip independent cycle support (currently all strips run the same cycle)
