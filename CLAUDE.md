# Doorbell Chime — Claude Guide

## Project Overview

This project controls LED light strips on Raspberry Pis and provides a web UI to manage them. The server runs animated patterns ("algorithms") organized into named "cycles" that rotate on a timer, generates pixel frames, and broadcasts them to strip clients over WebSocket.

## Architecture

```
┌─────────────┐   HTTP    ┌──────────────────────────────────────┐
│ React UI    │ ────────► │ web/server (Express + WebSocket)     │
│ web/client  │           │  - Runs animation algorithms         │
└─────────────┘           │  - Generates & broadcasts frames     │
                          │  - HTTP API for commands             │
                          └──────────────────────────────────────┘
                                         │ WebSocket (port 3002)
                          ┌──────────────┼──────────────┐
                          ▼              ▼              ▼
                   strip-client   strip-client-  strip-client-
                   (TypeScript)     python         rust
                   (Pi hardware)  (Pi hardware)  (Pi hardware)
```

Strip clients connect to the server, register themselves, and receive binary frame messages to drive their LED hardware.

## Directory Structure

| Directory | Language | Purpose |
|---|---|---|
| `web/server/` | TypeScript/Node | Central controller — runs algorithms, serves HTTP API, broadcasts frames |
| `web/client/` | TypeScript/React | Web UI (Blueprint.js, Emotion CSS, Jotai state) |
| `web/data/` | JSON | Shared data — cycle definitions, strip configs |
| `lights-cli/` | Go | CLI for sending commands (needs update: still uses ZMQ, see below) |
| `strip-client/` | TypeScript/Node | WebSocket strip client — drives hardware via piixel |
| `strip-client-python/` | Python | WebSocket strip client — drives hardware via neopixel |
| `strip-client-rust/` | Rust | WebSocket strip client — drives hardware via rpi_ws281x |

## Running Things

### Web server (the controller)
```sh
cd web/server
yarn
yarn start        # watch mode (ts-node)
```

### Web client
```sh
cd web/client
yarn
yarn dev          # webpack watch
# yarn build      # production build → web/client/dist/ (served by server)
```

### Strip clients — pick one per Pi

**TypeScript:**
```sh
cd strip-client && npm install
npm start                    # production
MOCK_PIIXEL=1 npm start      # mock terminal output
```

**Python:**
```sh
cd strip-client-python && pipenv install
pipenv run python strip_client.py
MOCK_NEOPIXEL=1 pipenv run python strip_client.py
```

**Rust (mock mode):**
```sh
cd strip-client-rust
MOCK_WS2818=1 cargo run
```

**Rust (build for Pi):**
```sh
cd strip-client-rust
./build-pi.sh               # requires OrbStack or Docker Desktop
scp strip-client-pi pi@raspberrypi.local:~/
```

## HTTP Command API

`web/server` exposes commands at `/api/actions/*`:

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/actions/get_status` | Returns `{ brightness, transition_time, running, current_cycle }` |
| `GET` | `/api/actions/get_cycles` | Returns array of cycle names |
| `POST` | `/api/actions/on` | Start running the current cycle |
| `POST` | `/api/actions/off` | Turn off the lights |
| `POST` | `/api/actions/next` | Skip to next algorithm |
| `POST` | `/api/actions/set_brightness/:value` | 0.0–1.0 |
| `POST` | `/api/actions/set_cycle/:name` | Must match a filename in `web/data/cycles/` |

> **Note:** `lights-cli` currently uses ZMQ and is broken — it needs to be updated to use these HTTP endpoints instead.

## Configuration Files

### `web/data/cycles/*.json`
Each file defines a named cycle of algorithms:
```json
{
  "name": "Default",
  "cycles": [
    { "algorithm": "twinkles", "seconds_in_cycle": 600, "options": { "density": 0.01, "freq": 0.25, "fadeTime": 2.0 } },
    { "algorithm": "lightning", "seconds_in_cycle": 600, "options": { "color": [0, 0, 1], "max_bolts": 3, "bolt_prob": 0.01, "bump_prob": 0.01 } }
  ]
}
```

### `web/server/status.json` (auto-generated, persisted across restarts)
```json
{ "brightness": 0.5, "transition_time": 2000, "running": false, "current_cycle": "Default" }
```

### `strip_config.json` (one per strip client)
```json
{
  "stripId": "my-strip",
  "server": { "host": "localhost", "wsPort": 3002 },
  "hardware": { "index_start": 0, "index_end": 29, "gpio_pin": 18, "bpp": 3, "order": "GRB", "skip": [] },
  "physical": { "length_meters": 1.0, "location": { "start": { "x": 0, "y": 3.5, "z": 0 }, "end": { "x": 1, "y": 3.5, "z": 0 } } }
}
```

## Adding a New Algorithm (`web/server`)

1. Create `src/algorithms/myAlgorithm/config.ts` exporting an `AlgorithmConfig`
2. Create `src/algorithms/myAlgorithm/myAlgorithm.ts` with a class extending `BaseAlgorithm`
3. Register it in `src/algorithms/index.ts` under a snake_case key
4. Use that key in any cycle JSON file

### Algorithm Contract

```typescript
class Algorithm extends BaseAlgorithm {
  constructor(numPixels: number, settings: Record<string, unknown>) {
    super(numPixels, config, settings)
    // Initialize this.pixels[] here (array of Pixel objects)
  }

  runCycle(elapsedMillis: number, elapsedSeconds: number): boolean {
    // Mutate this.pixels[] each frame
    // Return false normally; return true only if you are the Transition algorithm signalling completion
    return super.runCycle(elapsedMillis, elapsedSeconds)
  }
}
```

**`Pixel`** stores color in HSV + white channel (all 0.0–1.0). Use `pixel.set(hue, sat, val)` or mutate fields directly.

**`Pulse`** is a helper for applying a glow/blob at a position along the strip with configurable falloff on each side.

## web/server Key Notes

- Runtime: **Node.js** with `ts-node` / `tsx`
- `src/animation/runner.ts`: FPS-locked animation loop — runs algorithms, calls `FrameGenerator` each frame
- `src/animation/frameGenerator.ts`: Converts `Pixel[]` (HSV→RGB) to binary frame messages, broadcasts to all registered strip clients
- `src/websocket/server.ts`: WebSocket server — strip clients register here and receive binary frames
- `src/strips/registry.ts`: Tracks connected strips and their pixel layout
- `src/timer.ts`: FPS-locked loop using `setTimeout`
- Cycles loaded from `web/data/cycles/` (path overridable via `CYCLES_DIR` env var)

## Web Client Notes

- Built with React 18, Blueprint.js (icons/components), Emotion (CSS-in-JS), Jotai (state), React Router
- Polls `get_status` and `get_cycles` every 30 seconds
- API base: `/api/actions/*`
- Build: `yarn build` outputs to `web/client/dist/`, served statically by the Express server
