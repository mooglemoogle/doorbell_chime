# Doorbell Chime

LED light strip controller with a web UI. Runs animated patterns ("algorithms") organized into named "cycles" that rotate on a timer.

## Architecture

```
┌─────────────┐   HTTP    ┌──────────────────────────────────────┐
│ React UI    │ ────────► │ lights-control-server (Express + WS) │
│ web-client  │           │  - Runs animation algorithms         │
└─────────────┘           │  - Generates & broadcasts frames     │
                          └──────────────────────────────────────┘
                                       │ WebSocket (port 3002)
                                       ▼
                               strip-client-rust
                               (Pi hardware/Rust)
```

## Components

| Directory | Language | Purpose |
|---|---|---|
| `lights-control-server/` | TypeScript/Bun | Central controller — algorithms, HTTP API, WebSocket frame broadcast |
| `web-client/` | TypeScript/React | Web UI |
| `data/` | JSON | Cycle definitions and strip configs |
| `lights-cli/` | Go | CLI for sending commands |
| `strip-client-rust/` | Rust | WebSocket strip client (rpi_ws281x) |

---

## Building & Running

### Web Server + Client

```sh
# Server (watch mode)
cd lights-control-server && bun install && bun start

# Client (React, watch mode)
cd web-client && bun install && bun dev

# Client (production build → web-client/dist/, served by server)
cd web-client && bun run build
```

### CLI (`lights-cli`)

```sh
cd lights-cli
go build -o lights
./lights --help

# Copy binary to Pi
scp lights pi@raspberrypi.local:~/bin/
```

---

## Strip Client (`strip-client-rust/`)

Reads `~/.local/lights-control/strip_config.json` (override with `STRIP_CONFIG` env var), connects to the server's WebSocket, and drives a physical LED strip via GPIO/PWM (default GPIO 18).

### `~/.local/lights-control/strip_config.json`

```json
{
  "stripId": "my-strip",
  "server": { "host": "localhost", "wsPort": 3002 },
  "hardware": {
    "index_start": 0,
    "index_end": 29,
    "gpio_pin": 18,
    "bpp": 3,
    "order": "GRB",
    "skip": []
  },
  "physical": {
    "length_meters": 1.0,
    "location": {
      "start": { "x": 0.0, "y": 3.5, "z": 0.0 },
      "end":   { "x": 1.0, "y": 3.5, "z": 0.0 }
    }
  }
}
```

On first run without a config file, an interactive setup wizard will prompt for these values.

### Mock mode (no hardware)

```sh
cd strip-client-rust
MOCK_WS2818=1 cargo run
```

### Build for Raspberry Pi (aarch64)

Requires [OrbStack](https://orbstack.dev) or Docker Desktop running on Apple Silicon.

```sh
cd strip-client-rust
./build-pi.sh
```

The first run downloads the base image and compiles `rpi_ws281x` from source (~5 min). Subsequent builds are fast. Output: `strip-client-rust/strip-client-pi`.

```sh
# Deploy to Pi
scp strip-client-pi pi@raspberrypi.local:~/
ssh pi@raspberrypi.local './strip-client-pi'
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `MOCK_WS2818` | `0` | Set to `1` for mock terminal output |
| `STRIP_CONFIG` | `~/.local/lights-control/strip_config.json` | Path to config file |
