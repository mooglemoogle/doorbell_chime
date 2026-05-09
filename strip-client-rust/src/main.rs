/*!
strip-client-rust — WebSocket strip client using ws2818-rgb-led-spi-driver

Reads strip_config.json, connects to the light-control-ts WebSocket server,
buffers incoming timestamped frames, and drives the LED strip via SPI.

Environment variables:
  MOCK_WS2818=1      Print colored terminal blocks instead of driving hardware
  SPI_DEVICE=path    SPI device path (default: /dev/spidev0.0)
  STRIP_CONFIG=path  Path to strip_config.json (default: ./strip_config.json)
*/

use std::collections::BTreeMap;
use std::collections::HashSet;
use std::env;
use std::fs;
use std::io::Write as _;
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use serde_json::json;
use tungstenite::stream::MaybeTlsStream;
use tungstenite::Message;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize, Serialize, Clone)]
struct HardwareConfig {
    index_start: i32,
    index_end: i32,
    gpio_pin: u8,
    bpp: u8,
    order: String,
    #[serde(default)]
    skip: Vec<i32>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct ServerConfig {
    host: String,
    #[serde(rename = "wsPort")]
    ws_port: u16,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct StripConfig {
    #[serde(rename = "stripId")]
    strip_id: String,
    server: ServerConfig,
    hardware: HardwareConfig,
    physical: serde_json::Value,
}

// ---------------------------------------------------------------------------
// Frame buffer
// ---------------------------------------------------------------------------

const MSG_FRAME: u8 = 0x01;
const MSG_SYNC: u8 = 0x02;

struct FrameBuffer {
    frames: BTreeMap<u64, Vec<u8>>,
    last_frame: Option<Vec<u8>>,
    fps: u32,
}

impl FrameBuffer {
    fn new() -> Self {
        FrameBuffer {
            frames: BTreeMap::new(),
            last_frame: None,
            fps: 30,
        }
    }

    fn add_frame(&mut self, timestamp_ms: u64, pixels: Vec<u8>) {
        self.frames.insert(timestamp_ms, pixels);
        self.evict();
    }

    fn get_frame(&mut self, now_ms: u64) -> Option<Vec<u8>> {
        // Find the latest frame at or before now_ms
        let best_ts = self.frames.range(..=now_ms).next_back().map(|(&ts, _)| ts)?;
        let frame = self.frames.remove(&best_ts).unwrap();
        // Drop older frames
        let stale: Vec<u64> = self.frames.range(..best_ts).map(|(&k, _)| k).collect();
        for k in stale {
            self.frames.remove(&k);
        }
        self.last_frame = Some(frame.clone());
        Some(frame)
    }

    fn sync(&mut self, from_ms: u64, new_fps: u32) {
        let stale: Vec<u64> = self.frames.range(from_ms..).map(|(&k, _)| k).collect();
        for k in stale {
            self.frames.remove(&k);
        }
        self.fps = new_fps;
    }

    fn buffered_count(&self) -> usize {
        self.frames.len()
    }

    fn evict(&mut self) {
        let max = self.fps as usize;
        while self.frames.len() > max {
            let oldest = *self.frames.keys().next().unwrap();
            self.frames.remove(&oldest);
        }
    }
}

fn parse_message(data: &[u8], buffer: &mut FrameBuffer) {
    if data.is_empty() {
        return;
    }
    match data[0] {
        MSG_FRAME if data.len() >= 13 => {
            let hi = u32::from_be_bytes([data[1], data[2], data[3], data[4]]) as u64;
            let lo = u32::from_be_bytes([data[5], data[6], data[7], data[8]]) as u64;
            let timestamp_ms = hi * 0x100000000 + lo;
            let pixel_count = u16::from_be_bytes([data[11], data[12]]) as usize;
            let bpp = if data.len() == 13 + pixel_count * 4 { 4 } else { 3 };
            let pixels = data[13..13 + pixel_count * bpp].to_vec();
            buffer.add_frame(timestamp_ms, pixels);
        }
        MSG_SYNC if data.len() >= 11 => {
            let hi = u32::from_be_bytes([data[1], data[2], data[3], data[4]]) as u64;
            let lo = u32::from_be_bytes([data[5], data[6], data[7], data[8]]) as u64;
            let timestamp_ms = hi * 0x100000000 + lo;
            let fps = u16::from_be_bytes([data[9], data[10]]) as u32;
            buffer.sync(timestamp_ms, fps);
        }
        _ => {}
    }
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

fn term_color(r: u8, g: u8, b: u8) -> String {
    format!("\x1b[48;2;{r};{g};{b}m  \x1b[0m")
}

/// Reorder (r,g,b) into the wire order the LED strip expects.
fn reorder(order: &str, r: u8, g: u8, b: u8) -> (u8, u8, u8) {
    match order {
        "GRB" => (g, r, b),
        "BGR" => (b, g, r),
        "BRG" => (b, r, g),
        "RBG" => (r, b, g),
        "GBR" => (g, b, r),
        _ => (r, g, b),
    }
}

// ---------------------------------------------------------------------------
// Apply loop (runs in its own thread, owns the SPI adapter)
// ---------------------------------------------------------------------------

fn run_apply_loop(hw: HardwareConfig, buffer: Arc<Mutex<FrameBuffer>>, mock: bool, spi_device: String) {
    use ws2818_rgb_led_spi_driver::adapter_gen::WS28xxAdapter;
    use ws2818_rgb_led_spi_driver::adapter_spi::WS28xxSpiAdapter;

    let num_pixels = (hw.index_end - hw.index_start).unsigned_abs() as usize + 1;
    let skip: HashSet<i32> = hw.skip.iter().copied().collect();
    let reversed = hw.index_end < hw.index_start;
    let bpp = hw.bpp as usize;

    let mut adapter: Option<WS28xxSpiAdapter> = None;
    if !mock {
        match WS28xxSpiAdapter::new(&spi_device) {
            Ok(a) => adapter = Some(a),
            Err(e) => eprintln!("Failed to open SPI device {spi_device}: {e:?}"),
        }
    }

    let mut render_count: u32 = 0;
    let mut fps_window = Instant::now();
    let mut measured_fps: f32 = 0.0;

    let mut next_frame = Instant::now();

    loop {
        let (frame, fps, buffered, max_frames) = {
            let mut buf = buffer.lock().unwrap();
            let now_ms = now_ms();
            let f = buf.get_frame(now_ms).or_else(|| buf.last_frame.clone());
            let buffered = buf.buffered_count();
            let max = buf.fps as usize;
            (f, buf.fps, buffered, max)
        };

        if let Some(pixels) = frame {
            if mock {
                render_count += 1;
                let elapsed = fps_window.elapsed();
                if elapsed >= Duration::from_secs(1) {
                    measured_fps = render_count as f32 / elapsed.as_secs_f32();
                    render_count = 0;
                    fps_window = Instant::now();
                }

                let status = format!(
                    "fps: {measured_fps:.0}/{fps}  buf: {buffered}/{max_frames}\x1b[K\n"
                );
                let mut out = String::with_capacity(status.len() + num_pixels * 20);
                out.push_str(&status);
                for i in 0..num_pixels {
                    let src = i * bpp;
                    let r = pixels.get(src).copied().unwrap_or(0);
                    let g = pixels.get(src + 1).copied().unwrap_or(0);
                    let b = pixels.get(src + 2).copied().unwrap_or(0);
                    out.push_str(&term_color(r, g, b));
                }
                // Move cursor back up to overwrite both lines next frame
                out.push_str("\x1b[K\x1b[1A\r");
                print!("{out}");
                std::io::stdout().flush().ok();
            } else if let Some(ref mut adp) = adapter {
                let mut colors: Vec<(u8, u8, u8)> = Vec::with_capacity(num_pixels);
                for i in 0..num_pixels {
                    let logical = if reversed {
                        hw.index_start - i as i32
                    } else {
                        hw.index_start + i as i32
                    };
                    if skip.contains(&logical) {
                        colors.push((0, 0, 0));
                        continue;
                    }
                    let src = i * bpp;
                    let r = pixels.get(src).copied().unwrap_or(0);
                    let g = pixels.get(src + 1).copied().unwrap_or(0);
                    let b = pixels.get(src + 2).copied().unwrap_or(0);
                    // Note: W channel (bpp=4) is dropped — WS2818 strips are RGB only.
                    colors.push(reorder(&hw.order, r, g, b));
                }
                if let Err(e) = adp.write_rgb(&colors) {
                    eprintln!("SPI write error: {e:?}");
                }
            }
        }

        next_frame += Duration::from_secs_f64(1.0 / fps.max(1) as f64);
        let now = Instant::now();
        if next_frame > now {
            thread::sleep(next_frame - now);
        } else {
            // We're behind; reset the deadline to avoid a sleep-less spin
            next_frame = now;
        }
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config_path = env::var("STRIP_CONFIG").unwrap_or_else(|_| "strip_config.json".to_string());
    let config: StripConfig = serde_json::from_str(&fs::read_to_string(&config_path)?)?;

    let mock = env::var("MOCK_WS2818").map(|v| v == "1").unwrap_or(false);
    let spi_device = env::var("SPI_DEVICE").unwrap_or_else(|_| "/dev/spidev0.0".to_string());

    let buffer: Arc<Mutex<FrameBuffer>> = Arc::new(Mutex::new(FrameBuffer::new()));

    // Start apply loop in background thread
    {
        let hw = config.hardware.clone();
        let buf = Arc::clone(&buffer);
        thread::spawn(move || run_apply_loop(hw, buf, mock, spi_device));
    }

    // WebSocket connection loop with exponential backoff
    let url = format!("ws://{}:{}", config.server.host, config.server.ws_port);
    let addr = format!("{}:{}", config.server.host, config.server.ws_port);
    let strip_id = config.strip_id.clone();
    let num_pixels = (config.hardware.index_end - config.hardware.index_start).unsigned_abs() as usize + 1;
    let bpp = config.hardware.bpp;
    let physical = config.physical.clone();

    let mut reconnect_delay = Duration::from_secs(1);
    const RECONNECT_MAX: Duration = Duration::from_secs(30);
    const STATUS_INTERVAL: Duration = Duration::from_secs(5);

    loop {
        println!("Connecting to {url}...");

        let result = TcpStream::connect(&addr).and_then(|stream| {
            // Short read timeout so the status heartbeat can fire even with no traffic
            stream.set_read_timeout(Some(Duration::from_millis(200)))?;
            Ok(stream)
        });

        match result {
            Err(e) => eprintln!("TCP connect error: {e}"),
            Ok(stream) => match tungstenite::client(&url, stream) {
                Err(e) => eprintln!("WebSocket handshake error: {e}"),
                Ok((mut socket, _)) => {
                    println!("Connected to server");
                    reconnect_delay = Duration::from_secs(1);

                    // Register this strip with the server
                    let register = json!({
                        "type": "register",
                        "stripId": strip_id,
                        "config": {
                            "numPixels": num_pixels,
                            "bpp": bpp,
                            "physical": physical,
                        }
                    })
                    .to_string();
                    socket.send(Message::Text(register.into())).ok();

                    let mut last_status = Instant::now();

                    'recv: loop {
                        // Send status heartbeat if due
                        if last_status.elapsed() >= STATUS_INTERVAL {
                            let count = buffer.lock().unwrap().buffered_count();
                            let status = json!({
                                "type": "status",
                                "bufferedFrames": count,
                                "lastApplied": now_ms(),
                            })
                            .to_string();
                            if socket.send(Message::Text(status.into())).is_err() {
                                break 'recv;
                            }
                            last_status = Instant::now();
                        }

                        match socket.read() {
                            Ok(Message::Binary(data)) => {
                                parse_message(&data, &mut buffer.lock().unwrap());
                            }
                            Ok(Message::Close(_)) => break 'recv,
                            Ok(_) => {}
                            Err(tungstenite::Error::Io(e))
                                if e.kind() == std::io::ErrorKind::WouldBlock
                                    || e.kind() == std::io::ErrorKind::TimedOut =>
                            {
                                // Read timeout — loop to check status timer
                            }
                            Err(e) => {
                                eprintln!("WebSocket error: {e}");
                                break 'recv;
                            }
                        }
                    }

                    println!("Disconnected from server");
                }
            },
        }

        println!(
            "Reconnecting in {}s...",
            reconnect_delay.as_secs()
        );
        thread::sleep(reconnect_delay);
        reconnect_delay = (reconnect_delay * 2).min(RECONNECT_MAX);
    }
}
