#!/usr/bin/env python3
"""
strip-client-python — WebSocket strip client using neopixel

Reads strip_config.json, connects to the light-control-ts WebSocket server,
buffers incoming frames, and drives the LED strip via neopixel.

Environment variables:
  MOCK_NEOPIXEL=1    Print colored terminal blocks instead of driving hardware
  STRIP_CONFIG=path  Path to strip_config.json (default: ~/.local/lights-control/strip_config.json)
"""

import json
import logging
import os
import struct
import sys
import threading
import time
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

import websocket  # websocket-client

MOCK = os.environ.get("MOCK_NEOPIXEL") == "1"

MSG_FRAME = 0x01
MSG_SYNC = 0x02

RECONNECT_INITIAL_S = 1.0
RECONNECT_MAX_S = 30.0
STATUS_INTERVAL_S = 5.0


# ---------------------------------------------------------------------------
# Frame buffer
# ---------------------------------------------------------------------------

class FrameBuffer:
    def __init__(self) -> None:
        self.frames: dict[int, bytes] = {}
        self.last_frame: bytes | None = None
        self.fps: int = 30
        self._lock = threading.Lock()

    @property
    def max_frames(self) -> int:
        return self.fps

    def add_frame(self, timestamp_ms: int, pixels: bytes) -> None:
        with self._lock:
            self.frames[timestamp_ms] = pixels
            self._evict()

    def get_frame(self, now_ms: int) -> bytes | None:
        with self._lock:
            best_ts = -1
            for ts in self.frames:
                if ts <= now_ms and ts > best_ts:
                    best_ts = ts
            if best_ts == -1:
                return self.last_frame
            frame = self.frames[best_ts]
            to_delete = [ts for ts in self.frames if ts <= best_ts]
            for ts in to_delete:
                del self.frames[ts]
            self.last_frame = frame
            return frame

    def sync(self, from_ms: int, new_fps: int) -> None:
        with self._lock:
            to_delete = [ts for ts in self.frames if ts >= from_ms]
            for ts in to_delete:
                del self.frames[ts]
            self.fps = new_fps

    def buffered_count(self) -> int:
        with self._lock:
            return len(self.frames)

    def _evict(self) -> None:
        if len(self.frames) <= self.max_frames:
            return
        sorted_ts = sorted(self.frames.keys())
        excess = len(self.frames) - self.max_frames
        for ts in sorted_ts[:excess]:
            del self.frames[ts]


def parse_server_message(data: bytes, buffer: FrameBuffer) -> str | None:
    if len(data) < 1:
        return None
    msg_type = data[0]

    if msg_type == MSG_FRAME and len(data) >= 13:
        hi, lo = struct.unpack_from(">II", data, 1)
        timestamp_ms = hi * 0x100000000 + lo
        (pixel_count,) = struct.unpack_from(">H", data, 11)
        bpp = 4 if len(data) == 13 + pixel_count * 4 else 3
        pixels = bytes(data[13 : 13 + pixel_count * bpp])
        buffer.add_frame(timestamp_ms, pixels)
        return "frame"

    if msg_type == MSG_SYNC and len(data) >= 11:
        hi, lo = struct.unpack_from(">II", data, 1)
        timestamp_ms = hi * 0x100000000 + lo
        (fps,) = struct.unpack_from(">H", data, 9)
        buffer.sync(timestamp_ms, fps)
        return "sync"

    return None


# ---------------------------------------------------------------------------
# Light strip
# ---------------------------------------------------------------------------

def _term_color(r: int, g: int, b: int) -> str:
    return f"\x1b[48;2;{r};{g};{b}m  \x1b[0m"


def _reorder(order: str, r: int, g: int, b: int) -> tuple[int, int, int]:
    match order:
        case "GRB":  return (g, r, b)
        case "BGR":  return (b, g, r)
        case "BRG":  return (b, r, g)
        case "RBG":  return (r, b, g)
        case "GBR":  return (g, b, r)
        case _:       return (r, g, b)


class LightStrip:
    def __init__(self, config: dict) -> None:
        self.config = config
        self.index_start: int = config["index_start"]
        self.index_end: int = config["index_end"]
        self.num_pixels: int = abs(self.index_end - self.index_start) + 1
        self.bpp: int = config.get("bpp", 3)
        self.order: str = config.get("order", "GRB")
        self.skip: set[int] = set(config.get("skip", []))
        self.reversed: bool = self.index_end < self.index_start
        self._pixels = None  # neopixel.NeoPixel instance

    def initialize(self) -> None:
        if MOCK:
            return

        import board  # type: ignore[import]
        import neopixel  # type: ignore[import]

        pin_num = self.config["gpio_pin"]
        pin = getattr(board, f"D{pin_num}")
        pixel_order = getattr(neopixel, self.order, neopixel.GRB)

        self._pixels = neopixel.NeoPixel(
            pin,
            self.num_pixels,
            pixel_order=pixel_order,
            auto_write=False,
        )

    def apply_frame(self, frame: bytes) -> None:
        bpp = self.bpp

        if MOCK:
            parts = []
            for i in range(self.num_pixels):
                src = i * bpp
                r = frame[src] if src < len(frame) else 0
                g = frame[src + 1] if src + 1 < len(frame) else 0
                b = frame[src + 2] if src + 2 < len(frame) else 0
                parts.append(_term_color(r, g, b))
            sys.stdout.write("".join(parts) + "\r")
            sys.stdout.flush()
            return

        if self._pixels is None:
            return

        for i in range(self.num_pixels):
            logical_idx = (
                self.index_start - i if self.reversed else self.index_start + i
            )
            if logical_idx in self.skip:
                self._pixels[i] = (0, 0, 0, 0) if bpp == 4 else (0, 0, 0)
                continue

            src = i * bpp
            r = frame[src] if src < len(frame) else 0
            g = frame[src + 1] if src + 1 < len(frame) else 0
            b = frame[src + 2] if src + 2 < len(frame) else 0

            if bpp == 4:
                w = frame[src + 3] if src + 3 < len(frame) else 0
                self._pixels[i] = (r, g, b, w)
            else:
                self._pixels[i] = (r, g, b)

        self._pixels.show()


# ---------------------------------------------------------------------------
# WebSocket client
# ---------------------------------------------------------------------------

class ServerClient:
    def __init__(
        self,
        config: dict,
        strip_id: str,
        num_pixels: int,
        bpp: int,
        physical: dict,
        buffer: FrameBuffer,
        logger: logging.Logger,
    ) -> None:
        self.config = config
        self.strip_id = strip_id
        self.num_pixels = num_pixels
        self.bpp = bpp
        self.physical = physical
        self.buffer = buffer
        self.log = logger
        self.reconnect_delay = RECONNECT_INITIAL_S
        self.destroyed = False
        self._ws: websocket.WebSocketApp | None = None
        self._stop_status = threading.Event()

    def connect(self) -> None:
        url = f"ws://{self.config['host']}:{self.config['wsPort']}"
        while not self.destroyed:
            self.log.info("Connecting to %s", url)
            self._ws = websocket.WebSocketApp(
                url,
                on_open=self._on_open,
                on_message=self._on_message,
                on_close=self._on_close,
                on_error=self._on_error,
            )
            self._ws.run_forever()
            if not self.destroyed:
                self.log.info("Reconnecting in %.0fs", self.reconnect_delay)
                time.sleep(self.reconnect_delay)
                self.reconnect_delay = min(self.reconnect_delay * 2, RECONNECT_MAX_S)

    def destroy(self) -> None:
        self.destroyed = True
        self._stop_status.set()
        if self._ws:
            self._ws.close()

    def _on_open(self, ws: websocket.WebSocketApp) -> None:
        self.log.info("Connected to server")
        self.reconnect_delay = RECONNECT_INITIAL_S
        self._send({
            "type": "register",
            "stripId": self.strip_id,
            "config": {
                "numPixels": self.num_pixels,
                "bpp": self.bpp,
                "physical": self.physical,
            },
        })
        self._stop_status.clear()
        t = threading.Thread(target=self._status_loop, daemon=True)
        t.start()

    def _on_message(self, ws: websocket.WebSocketApp, data: bytes | str) -> None:
        if isinstance(data, bytes):
            parse_server_message(data, self.buffer)

    def _on_close(self, ws: websocket.WebSocketApp, code: int, msg: str) -> None:
        self.log.info("Disconnected from server")
        self._stop_status.set()

    def _on_error(self, ws: websocket.WebSocketApp, error: Exception) -> None:
        self.log.error("WebSocket error: %s", error)

    def _status_loop(self) -> None:
        while not self._stop_status.wait(STATUS_INTERVAL_S):
            self._send({
                "type": "status",
                "bufferedFrames": self.buffer.buffered_count(),
                "lastApplied": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
            })

    def _send(self, msg: dict) -> None:
        if self._ws and not self.destroyed:
            try:
                self._ws.send(json.dumps(msg))
            except Exception as e:
                self.log.error("Send error: %s", e)


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def setup_logging(strip_id: str) -> logging.Logger:
    log_dir = Path.home() / ".local" / "lights-control" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    lg = logging.getLogger(f"strip.{strip_id}")
    lg.setLevel(logging.INFO)

    console = logging.StreamHandler()
    console.setFormatter(logging.Formatter("%(asctime)s %(levelname)s: %(message)s", datefmt="%H:%M:%S"))
    lg.addHandler(console)

    file_handler = TimedRotatingFileHandler(
        log_dir / f"strip-{strip_id}.log",
        when="midnight",
        backupCount=14,
    )
    file_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    lg.addHandler(file_handler)

    return lg


# ---------------------------------------------------------------------------
# Setup wizard
# ---------------------------------------------------------------------------

def _ask(prompt: str, default: str) -> str:
    answer = input(f"  {prompt} [{default}]: ").strip()
    return answer if answer else default


def run_setup_wizard(config_path: str) -> dict:
    print(f"\nNo config found at {config_path}. Let's set one up.\n")

    strip_id      = _ask("Strip ID",                           "my-strip")
    host          = _ask("Server host",                        "localhost")
    ws_port       = int(_ask("Server WebSocket port",          "3002"))
    index_start   = int(_ask("LED index start",                "0"))
    index_end     = int(_ask("LED index end (inclusive)",      "29"))
    gpio_pin      = int(_ask("GPIO pin",                       "18"))
    bpp           = int(_ask("Bytes per pixel (3=RGB, 4=RGBW)", "3"))
    order         =     _ask("Pixel order",                    "GRB")
    length_meters = float(_ask("Strip length (meters)",        "1.0"))

    config = {
        "stripId": strip_id,
        "server": {"host": host, "wsPort": ws_port},
        "hardware": {
            "index_start": index_start,
            "index_end": index_end,
            "gpio_pin": gpio_pin,
            "bpp": bpp,
            "order": order,
            "skip": [],
        },
        "physical": {
            "length_meters": length_meters,
            "location": {
                "start": {"x": 0.0, "y": 0.0, "z": 0.0},
                "end":   {"x": length_meters, "y": 0.0, "z": 0.0},
            },
        },
    }

    Path(config_path).parent.mkdir(parents=True, exist_ok=True)
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    print(f"\nConfig saved to {config_path}\n")
    return config


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    env_path = os.environ.get("STRIP_CONFIG")
    config_path = env_path or str(Path.home() / ".local" / "lights-control" / "strip_config.json")

    if not Path(config_path).exists():
        if env_path:
            raise FileNotFoundError(f"strip_config.json not found at {config_path}")
        config = run_setup_wizard(config_path)
    else:
        with open(config_path) as f:
            config = json.load(f)

    logger = setup_logging(config["stripId"])

    hw = config["hardware"]
    num_pixels = abs(hw["index_end"] - hw["index_start"]) + 1
    bpp = hw.get("bpp", 3)

    buffer = FrameBuffer()
    strip = LightStrip(hw)
    strip.initialize()

    client = ServerClient(
        config["server"],
        config["stripId"],
        num_pixels,
        bpp,
        config["physical"],
        buffer,
        logger,
    )

    def apply_loop() -> None:
        next_frame = time.monotonic()
        while True:
            now_ms = int(time.time() * 1000)
            frame = buffer.get_frame(now_ms)
            if frame:
                strip.apply_frame(frame)
            fps = buffer.fps
            next_frame += 1.0 / max(fps, 1)
            remaining = next_frame - time.monotonic()
            if remaining > 0:
                time.sleep(remaining)
            else:
                next_frame = time.monotonic()

    threading.Thread(target=apply_loop, daemon=True).start()

    try:
        client.connect()
    except KeyboardInterrupt:
        client.destroy()


if __name__ == "__main__":
    main()
