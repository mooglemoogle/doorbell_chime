# Doorbell Chime — Claude Guide

## Project Overview

This project controls an LED light strip on a Raspberry Pi and provides a web UI to manage it. The light strip runs animated patterns ("algorithms") organized into named "cycles" that rotate on a timer.

## Architecture

```
┌─────────────┐   HTTP    ┌──────────────────┐  ZMQ REQ  ┌───────────────────┐
│ React UI    │ ────────► │ Express Server   │ ─────────► │ Light Controller  │
│ web/client  │           │ web/server       │            │ light-control-ts  │
└─────────────┘           └──────────────────┘            └───────────────────┘
                                                                    ▲
                          ┌──────────────────┐  ZMQ REQ            │
                          │  Go CLI          │ ────────────────────►│
                          │  lights-cli      │
                          └──────────────────┘
```

The light controller runs a **ZMQ REP socket on port 5555**. Both the web server and the Go CLI connect to it via ZMQ REQ. All messages are JSON. This is the critical integration point — anything communicating with the light controller must speak this protocol.

## Directory Structure

| Directory | Language | Purpose |
|---|---|---|
| `light-control/` | Python | Original LED controller (legacy, use `light-control-ts` instead) |
| `light-control-ts/` | TypeScript/Node | Active LED controller — runs on the Pi |
| `lights-cli/` | Go | CLI for sending commands from the terminal |
| `web/server/` | TypeScript/Node | Express REST API, bridges HTTP → ZMQ |
| `web/client/` | TypeScript/React | Web UI (Blueprint.js, Emotion CSS, Jotai state) |

## Running Things

### Light controller
```sh
cd light-control-ts
npm install
npm start              # production (requires Raspberry Pi hardware)
npm run dev            # development (mocks hardware in terminal via MOCK_PIIXEL=1)
```

### Web server + client
```sh
cd web/server && yarn build:live   # runs ts-node with watch
cd web/client && yarn dev          # webpack watch
```

### Go CLI (build once, copy binary to Pi)
```sh
cd lights-cli
go build -o lights
./lights --help
```

## ZMQ Command Protocol

All commands are JSON sent to `tcp://localhost:5555`. The controller replies with:
```json
{ "accepted": true, "response": <optional data> }
// or
{ "accepted": false, "message": "error description" }
```

| Command | Payload | Notes |
|---|---|---|
| `on` | — | Start running the current cycle |
| `off` | — | Turn off the lights |
| `next` | — | Skip to the next algorithm in the cycle |
| `set_brightness` | `{ brightness: 0.0–1.0 }` | |
| `set_cycle` | `{ name: "Default" }` | Must match a filename in `cycles/` |
| `get_status` | — | Returns `{ brightness, transition_time, running, current_cycle }` |
| `get_cycles` | — | Returns array of cycle names |

## Configuration Files

These JSON files are **shared between** `light-control/` and `light-control-ts/` — same format for both.

### `light-control-ts/light_config.json`
Defines the physical LED strips (copied from `light_config_sample.json`):
```json
{
  "light_strips": [{
    "index_start": 0,    // logical pixel index start
    "index_end": 29,     // logical pixel index end (reversed if end < start)
    "gpio_pin": 18,      // GPIO pin number
    "bpp": 3,            // bytes per pixel: 3 = RGB, 4 = RGBW
    "order": "GRB",      // color channel order
    "skip": []           // pixel indices to leave dark (e.g. obstructed by mount)
  }]
}
```

### `light-control-ts/status.json` (auto-generated, persisted across restarts)
```json
{ "brightness": 0.5, "transition_time": 2000, "running": false, "current_cycle": "Default" }
```

### `light-control/cycles/*.json` (shared)
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

## Adding a New Algorithm (`light-control-ts`)

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

**`Pixel`** stores color in HSV + white channel (all 0.0–1.0). The light strip converts HSV → RGB when rendering. Use `pixel.set(hue, sat, val)` or mutate fields directly.

**`Pulse`** is a helper for applying a glow/blob at a position along the strip with configurable falloff on each side.

## light-control-ts Key Notes

- Runtime: **Node.js** with `tsx` (not Bun — zeromq is incompatible with Bun)
- `src/commandWatcher.ts`: ZMQ commands arrive on a background async loop and are queued; the main loop processes them each frame via `runner.runCycle()`
- `src/lightStrip.ts`: Converts `Pixel[]` (HSV) → packed `Uint32Array` (RGB) for piixel. In dev mode (`MODE=DEVELOPMENT`) it prints colored blocks to the terminal instead of driving hardware
- `src/timer.ts`: FPS-locked loop using `setTimeout` — `updateFps()` is called each frame so the rate can change when algorithms change
- piixel only works on Raspberry Pi (not Pi 5). Set `MOCK_PIIXEL=1` for local dev

## Web Client Notes

- Built with React 18, Blueprint.js (icons/components), Emotion (CSS-in-JS), Jotai (state), React Router
- Polls `get_status` and `get_cycles` every 30 seconds via `useInterval`
- API base: `/api/actions/*` — all proxied through the Express server to ZMQ
- Build: `yarn build` outputs to `web/client/dist/`, served statically by the Express server

## lights-cli Notes

- Single `main.go` with all commands. Uses `cobra` (subcommands) and `go-zeromq/zmq4` (pure Go ZMQ, no C library needed)
- Commands: `on`, `off`, `next`, `brightness <0.0-1.0>`, `status`, `cycles`, `set-cycle <name>`
- Build a standalone binary: `go build -o lights && scp lights pi@raspberrypi:~/bin/`
