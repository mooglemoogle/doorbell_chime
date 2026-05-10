# Doorbell Chime

LED light strip controller with a web UI. Runs animated patterns ("algorithms") organized into named "cycles" that rotate on a timer.

## Architecture

```
┌─────────────┐   HTTP    ┌──────────────────┐  ZMQ REQ  ┌───────────────────┐
│ React UI    │ ────────► │ Express Server   │ ─────────► │ Light Controller  │
│ web/client  │           │ web/server       │            │ light-control-ts  │
└─────────────┘           └──────────────────┘            └───────────────────┘
                                                                    │ WebSocket
                                                           ┌────────┴────────┐
                                                           │  Strip Clients  │
                                                           │  (Pi hardware)  │
                                                           └─────────────────┘
```

## Components

| Directory | Language | Purpose |
|---|---|---|
| `light-control-ts/` | TypeScript/Node | LED controller — runs on the Pi |
| `web/server/` | TypeScript/Node | Express REST API, bridges HTTP → ZMQ |
| `web/client/` | TypeScript/React | Web UI |
| `lights-cli/` | Go | CLI for sending commands |
| `strip-client/` | TypeScript/Node | WebSocket strip client (TypeScript) |
| `strip-client-python/` | Python | WebSocket strip client (Python/neopixel) |
| `strip-client-rust/` | Rust | WebSocket strip client (Rust/rpi_ws281x) |

---

## Building & Running

### Light Controller (`light-control-ts`)

```sh
cd light-control-ts
npm install
npm start          # production (requires Pi hardware)
npm run dev        # mock mode — prints colored blocks in terminal
```

Copy `light_config_sample.json` to `light_config.json` and configure your strip(s) before running.

### Web Server + Client

```sh
# Server (TypeScript, watch mode)
cd web/server && yarn && yarn start

# Client (React, watch mode)
cd web/client && yarn && yarn dev
```

The client is served statically by the Express server after `yarn build`.

### CLI (`lights-cli`)

```sh
cd lights-cli
go build -o lights
./lights --help

# Copy binary to Pi
scp lights pi@raspberrypi.local:~/bin/
```

---

## Strip Clients

Each strip client reads a `strip_config.json`, connects to the light controller's WebSocket server, and drives a physical LED strip. Run one client per strip.

### `strip_config.json` format

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

### TypeScript strip client (`strip-client/`)

```sh
cd strip-client
npm install
npm start          # production
MOCK_PIIXEL=1 npm start   # mock mode
```

### Python strip client (`strip-client-python/`)

Requires Python 3.13 and `pipenv`. On hardware, also requires the neopixel libraries (pre-installed on Raspberry Pi OS).

```sh
cd strip-client-python
pipenv install
pipenv run python strip_client.py          # production
MOCK_NEOPIXEL=1 pipenv run python strip_client.py   # mock mode
```

### Rust strip client (`strip-client-rust/`)

Uses [rpi_ws281x](https://github.com/jgarff/rpi_ws281x) via GPIO/PWM (same pin as neopixel, default GPIO 18).

#### Mock mode (macOS, no hardware)

```sh
cd strip-client-rust
MOCK_WS2818=1 cargo run
```

#### Build for Raspberry Pi (aarch64)

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

#### Environment variables

| Variable | Default | Description |
|---|---|---|
| `MOCK_WS2818` | `0` | Set to `1` for mock terminal output |
| `STRIP_CONFIG` | `strip_config.json` | Path to config file |
