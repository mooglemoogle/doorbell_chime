/*!
strip-client-rust — WebSocket strip client using ws2818-rgb-led-spi-driver

Reads strip_config.json, connects to the light-control-ts WebSocket server,
buffers incoming timestamped frames, and drives the LED strip via SPI.

Environment variables:
  MOCK_WS2818=1      Print colored terminal blocks instead of driving hardware
  STRIP_CONFIG=path  Path to strip_config.json (default: ~/.local/lights-control/strip_config.json)

Build flags:
  --features hardware   Enable WS281x hardware output (requires rpi_ws281x C library)
*/

use std::collections::BTreeMap;
use std::collections::HashSet;
use std::env;
use std::fs;
use std::io::Write as _;
use std::net::TcpStream;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use tracing::{error, info, warn};
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use serde::{Deserialize, Serialize};
use serde_json::json;
// use tungstenite::stream::MaybeTlsStream;
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
    dropped: u64,
    avg_latency_ms: f64,
    avg_frame_interval_ms: f64,
    last_consumed_ts: Option<u64>,
}

impl FrameBuffer {
    fn new() -> Self {
        FrameBuffer {
            frames: BTreeMap::new(),
            last_frame: None,
            fps: 30,
            dropped: 0,
            avg_latency_ms: 0.0,
            avg_frame_interval_ms: 0.0,
            last_consumed_ts: None,
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
        // Drop older frames — they were never displayed
        let stale: Vec<u64> = self.frames.range(..best_ts).map(|(&k, _)| k).collect();
        self.dropped += stale.len() as u64;
        for k in stale {
            self.frames.remove(&k);
        }
        // EMA of how late we are consuming each frame (α = 0.1)
        let latency = now_ms.saturating_sub(best_ts) as f64;
        self.avg_latency_ms = self.avg_latency_ms * 0.9 + latency * 0.1;
        // EMA of gap between consecutive frame target timestamps (α = 0.1)
        if let Some(prev_ts) = self.last_consumed_ts {
            let interval = best_ts.saturating_sub(prev_ts) as f64;
            self.avg_frame_interval_ms = self.avg_frame_interval_ms * 0.9 + interval * 0.1;
        }
        self.last_consumed_ts = Some(best_ts);
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

    fn next_frame_ts(&self) -> Option<u64> {
        self.frames.keys().next().copied()
    }

    fn evict(&mut self) {
        let max = self.fps as usize;
        while self.frames.len() > max {
            let oldest = *self.frames.keys().next().unwrap();
            self.frames.remove(&oldest);
            self.dropped += 1;
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

// ---------------------------------------------------------------------------
// Apply loop (runs in its own thread, owns the WS281x controller)
// ---------------------------------------------------------------------------

fn run_apply_loop(hw: HardwareConfig, buffer: Arc<Mutex<FrameBuffer>>, mock: bool) {
    let num_pixels = (hw.index_end - hw.index_start).unsigned_abs() as usize + 1;
    let skip: HashSet<i32> = hw.skip.iter().copied().collect();
    let reversed = hw.index_end < hw.index_start;
    let bpp = hw.bpp as usize;

    #[cfg(feature = "hardware")]
    let mut controller: Option<rs_ws281x::Controller> = {
        use rs_ws281x::{ChannelBuilder, ControllerBuilder, StripType};
        let strip_type = match hw.order.as_str() {
            "GRB" => StripType::Ws2811Grb,
            "BGR" => StripType::Ws2811Bgr,
            "RBG" => StripType::Ws2811Rbg,
            "GBR" => StripType::Ws2811Gbr,
            "BRG" => StripType::Ws2811Brg,
            _ => StripType::Ws2811Rgb,
        };
        if !mock {
            match ControllerBuilder::new()
                .freq(800_000)
                .dma(10)
                .channel(
                    0,
                    ChannelBuilder::new()
                        .pin(hw.gpio_pin as i32)
                        .count(num_pixels as i32)
                        .strip_type(strip_type)
                        .brightness(255)
                        .build(),
                )
                .build()
            {
                Ok(c) => Some(c),
                Err(e) => {
                    error!("Failed to initialize WS281x on GPIO{}: {e:?}", hw.gpio_pin);
                    None
                }
            }
        } else {
            None
        }
    };

    let mut render_count: u32 = 0;
    let mut fps_window = Instant::now();
    let mut measured_fps: f32 = 0.0;
    // Print immediately on first frame, then every 500 ms
    let mut last_status = Instant::now() - Duration::from_millis(500);

    loop {
        let (frame, fps, buffered, max_frames, dropped, avg_lat, avg_interval, next_ts) = {
            let mut buf = buffer.lock().unwrap();
            let now_ms = now_ms();
            let f = buf.get_frame(now_ms).or_else(|| buf.last_frame.clone());
            let buffered = buf.buffered_count();
            let max = buf.fps as usize;
            let next = buf.next_frame_ts();
            (f, buf.fps, buffered, max, buf.dropped, buf.avg_latency_ms, buf.avg_frame_interval_ms, next)
        };

        if let Some(pixels) = frame {
            // Track FPS regardless of mode
            render_count += 1;
            let elapsed = fps_window.elapsed();
            if elapsed >= Duration::from_secs(1) {
                measured_fps = render_count as f32 / elapsed.as_secs_f32();
                render_count = 0;
                fps_window = Instant::now();
            }

            if mock {
                let status = format!(
                    "fps: {measured_fps:.0}/{fps}  buf: {buffered}/{max_frames}  drop: {dropped}  interval: {avg_interval:.1}ms  lat: {avg_lat:.1}ms\x1b[K\n"
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
            } else {
                #[cfg(feature = "hardware")]
                if let Some(ref mut ctrl) = controller {
                    let leds = ctrl.leds_mut(0);
                    for i in 0..num_pixels.min(leds.len()) {
                        let logical = if reversed {
                            hw.index_start - i as i32
                        } else {
                            hw.index_start + i as i32
                        };
                        if skip.contains(&logical) {
                            leds[i] = [0u8; 4];
                            continue;
                        }
                        let src = i * bpp;
                        let r = pixels.get(src).copied().unwrap_or(0);
                        let g = pixels.get(src + 1).copied().unwrap_or(0);
                        let b = pixels.get(src + 2).copied().unwrap_or(0);
                        // RawColor = [u8; 4] is little-endian bytes of uint32_t 0x00RRGGBB,
                        // so byte order is [B, G, R, W]. StripType handles wire-order reordering.
                        leds[i] = [b, g, r, 0];
                    }
                    if let Err(e) = ctrl.render() {
                        error!("WS281x render error: {e:?}");
                    }
                }

                #[cfg(not(feature = "hardware"))]
                warn!("Hardware support not compiled in — rebuild with --features hardware, or set MOCK_WS2818=1.");

                if last_status.elapsed() >= Duration::from_millis(500) {
                    last_status = Instant::now();
                    print!("fps: {measured_fps:.0}/{fps}  buf: {buffered}/{max_frames}  drop: {dropped}  interval: {avg_interval:.1}ms  lat: {avg_lat:.1}ms\x1b[K\r");
                    std::io::stdout().flush().ok();
                }
            }
        }

        let now = now_ms();
        let sleep_ms = next_ts
            .map(|ts| ts.saturating_sub(now))
            .unwrap_or(1000 / fps.max(1) as u64);
        if sleep_ms > 0 {
            thread::sleep(Duration::from_millis(sleep_ms));
        }
    }
}

// ---------------------------------------------------------------------------
// Setup wizard
// ---------------------------------------------------------------------------

fn prompt(label: &str, default: &str) -> String {
    print!("  {label} [{default}]: ");
    std::io::stdout().flush().ok();
    let mut buf = String::new();
    std::io::stdin().read_line(&mut buf).expect("Failed to read input");
    let trimmed = buf.trim().to_string();
    if trimmed.is_empty() { default.to_string() } else { trimmed }
}

fn run_setup_wizard(config_path: &str) -> StripConfig {
    println!("\nNo config found at {config_path}. Let's set one up.\n");

    let strip_id      =          prompt("Strip ID",                           "my-strip");
    let host          =          prompt("Server host",                        "localhost");
    let ws_port: u16  =          prompt("Server WebSocket port",              "3002").parse().unwrap_or(3002);
    let index_start: i32 =       prompt("LED index start",                   "0").parse().unwrap_or(0);
    let index_end: i32 =         prompt("LED index end (inclusive)",          "29").parse().unwrap_or(29);
    let gpio_pin: u8  =          prompt("GPIO pin",                          "18").parse().unwrap_or(18);
    let bpp: u8       =          prompt("Bytes per pixel (3=RGB, 4=RGBW)",   "3").parse().unwrap_or(3);
    let order         =          prompt("Pixel order",                        "GRB");
    let length_meters: f64 =     prompt("Strip length (meters)",              "1.0").parse().unwrap_or(1.0);

    let config = StripConfig {
        strip_id,
        server: ServerConfig { host, ws_port },
        hardware: HardwareConfig { index_start, index_end, gpio_pin, bpp, order, skip: vec![] },
        physical: serde_json::json!({
            "length_meters": length_meters,
            "location": {
                "start": { "x": 0.0, "y": 0.0, "z": 0.0 },
                "end":   { "x": length_meters, "y": 0.0, "z": 0.0 }
            }
        }),
    };

    let path = std::path::Path::new(config_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).expect("Failed to create config directory");
    }
    fs::write(config_path, serde_json::to_string_pretty(&config).unwrap())
        .expect("Failed to write config file");
    println!("\nConfig saved to {config_path}\n");
    config
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
    let env_path = env::var("STRIP_CONFIG").ok();
    let config_path = env_path.clone().unwrap_or_else(|| {
        let home = env::var("HOME").expect("HOME environment variable not set");
        format!("{home}/.local/lights-control/strip_config.json")
    });

    let config: StripConfig = if std::path::Path::new(&config_path).exists() {
        serde_json::from_str(&fs::read_to_string(&config_path)?)?
    } else if env_path.is_some() {
        return Err(format!("strip_config.json not found at {config_path}").into());
    } else {
        run_setup_wizard(&config_path)
    };

    let log_dir = PathBuf::from(env::var("HOME").expect("HOME not set"))
        .join(".local").join("lights-control").join("logs");
    fs::create_dir_all(&log_dir).expect("Failed to create log directory");

    let file_appender = tracing_appender::rolling::RollingFileAppender::builder()
        .rotation(tracing_appender::rolling::Rotation::DAILY)
        .filename_prefix(format!("strip-{}", config.strip_id))
        .filename_suffix("log")
        .max_log_files(14)
        .build(&log_dir)
        .expect("Failed to initialize log file");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("warn")))
        .with(fmt::layer().with_writer(std::io::stderr).with_target(false))
        .with(fmt::layer().with_ansi(false).with_writer(non_blocking).with_target(false))
        .init();

    let mock = env::var("MOCK_WS2818").map(|v| v == "1").unwrap_or(false);

    let buffer: Arc<Mutex<FrameBuffer>> = Arc::new(Mutex::new(FrameBuffer::new()));

    // Start apply loop in background thread
    {
        let hw = config.hardware.clone();
        let buf = Arc::clone(&buffer);
        thread::spawn(move || run_apply_loop(hw, buf, mock));
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
        info!("Connecting to {url}");

        let result = TcpStream::connect(&addr).and_then(|stream| {
            // Short read timeout so the status heartbeat can fire even with no traffic
            stream.set_read_timeout(Some(Duration::from_millis(200)))?;
            Ok(stream)
        });

        match result {
            Err(e) => error!("TCP connect error: {e}"),
            Ok(stream) => match tungstenite::client(&url, stream) {
                Err(e) => error!("WebSocket handshake error: {e}"),
                Ok((mut socket, _)) => {
                    info!("Connected to server");
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
                                error!("WebSocket error: {e}");
                                break 'recv;
                            }
                        }
                    }

                    info!("Disconnected from server");
                }
            },
        }

        info!("Reconnecting in {}s", reconnect_delay.as_secs());
        thread::sleep(reconnect_delay);
        reconnect_delay = (reconnect_delay * 2).min(RECONNECT_MAX);
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // -----------------------------------------------------------------------
    // Binary message builders
    // -----------------------------------------------------------------------

    fn make_frame_msg(ts_ms: u64, frame_num: u16, pixels: &[u8]) -> Vec<u8> {
        let pixel_count = (pixels.len() / 3) as u16;
        let mut data = vec![0u8; 13 + pixels.len()];
        data[0] = MSG_FRAME;
        data[1..5].copy_from_slice(&((ts_ms >> 32) as u32).to_be_bytes());
        data[5..9].copy_from_slice(&(ts_ms as u32).to_be_bytes());
        data[9..11].copy_from_slice(&frame_num.to_be_bytes());
        data[11..13].copy_from_slice(&pixel_count.to_be_bytes());
        data[13..].copy_from_slice(pixels);
        data
    }

    fn make_frame_msg_rgbw(ts_ms: u64, pixels: &[u8]) -> Vec<u8> {
        let pixel_count = (pixels.len() / 4) as u16;
        let mut data = vec![0u8; 13 + pixels.len()];
        data[0] = MSG_FRAME;
        data[1..5].copy_from_slice(&((ts_ms >> 32) as u32).to_be_bytes());
        data[5..9].copy_from_slice(&(ts_ms as u32).to_be_bytes());
        data[9..11].copy_from_slice(&0u16.to_be_bytes());
        data[11..13].copy_from_slice(&pixel_count.to_be_bytes());
        data[13..].copy_from_slice(pixels);
        data
    }

    fn make_sync_msg(ts_ms: u64, fps: u16) -> Vec<u8> {
        let mut data = vec![0u8; 11];
        data[0] = MSG_SYNC;
        data[1..5].copy_from_slice(&((ts_ms >> 32) as u32).to_be_bytes());
        data[5..9].copy_from_slice(&(ts_ms as u32).to_be_bytes());
        data[9..11].copy_from_slice(&fps.to_be_bytes());
        data
    }

    // -----------------------------------------------------------------------
    // FrameBuffer
    // -----------------------------------------------------------------------

    #[test]
    fn frame_buffer_starts_empty() {
        let buf = FrameBuffer::new();
        assert_eq!(buf.buffered_count(), 0);
        assert_eq!(buf.fps, 30);
    }

    #[test]
    fn get_frame_returns_none_when_empty() {
        let mut buf = FrameBuffer::new();
        assert!(buf.get_frame(1_000_000).is_none());
    }

    #[test]
    fn get_frame_returns_frame_at_exact_timestamp() {
        let mut buf = FrameBuffer::new();
        buf.add_frame(1000, vec![255, 0, 0]);
        assert_eq!(buf.get_frame(1000), Some(vec![255, 0, 0]));
    }

    #[test]
    fn get_frame_returns_latest_at_or_before_now() {
        let mut buf = FrameBuffer::new();
        buf.add_frame(1000, vec![1]);
        buf.add_frame(2000, vec![2]);
        buf.add_frame(3000, vec![3]);
        assert_eq!(buf.get_frame(2500), Some(vec![2]));
    }

    #[test]
    fn get_frame_returns_none_for_future_frames() {
        let mut buf = FrameBuffer::new();
        buf.add_frame(9000, vec![99]);
        assert!(buf.get_frame(5000).is_none());
    }

    #[test]
    fn get_frame_removes_consumed_and_older_frames() {
        let mut buf = FrameBuffer::new();
        buf.add_frame(1000, vec![1]);
        buf.add_frame(2000, vec![2]);
        buf.add_frame(3000, vec![3]);
        buf.get_frame(2000); // consumes 2000, removes 1000
        assert_eq!(buf.buffered_count(), 1); // only 3000 remains
    }

    #[test]
    fn get_frame_keeps_future_frames() {
        let mut buf = FrameBuffer::new();
        buf.add_frame(1000, vec![1]);
        buf.add_frame(5000, vec![2]);
        buf.get_frame(1000);
        assert_eq!(buf.get_frame(5000), Some(vec![2]));
    }

    #[test]
    fn get_frame_sets_last_frame() {
        let mut buf = FrameBuffer::new();
        buf.add_frame(100, vec![42, 43, 44]);
        let frame = buf.get_frame(100);
        assert!(frame.is_some());
        assert_eq!(buf.last_frame, Some(vec![42, 43, 44]));
    }

    #[test]
    fn sync_removes_frames_at_or_after_from_ms() {
        let mut buf = FrameBuffer::new();
        buf.add_frame(1000, vec![1]);
        buf.add_frame(2000, vec![2]);
        buf.add_frame(3000, vec![3]);
        buf.sync(2000, 30);
        assert_eq!(buf.buffered_count(), 1); // only 1000 remains
        assert_eq!(buf.get_frame(1000), Some(vec![1]));
    }

    #[test]
    fn sync_updates_fps() {
        let mut buf = FrameBuffer::new();
        buf.sync(0, 60);
        assert_eq!(buf.fps, 60);
    }

    #[test]
    fn sync_clears_all_frames_from_zero() {
        let mut buf = FrameBuffer::new();
        buf.add_frame(1000, vec![1]);
        buf.add_frame(2000, vec![2]);
        buf.sync(0, 30);
        assert_eq!(buf.buffered_count(), 0);
    }

    #[test]
    fn sync_keeps_frames_before_from_ms() {
        let mut buf = FrameBuffer::new();
        buf.add_frame(500, vec![1]);
        buf.sync(1000, 30);
        assert_eq!(buf.buffered_count(), 1);
    }

    #[test]
    fn evict_drops_oldest_frames_when_over_fps_limit() {
        let mut buf = FrameBuffer::new();
        buf.fps = 3;
        buf.add_frame(1000, vec![1]);
        buf.add_frame(2000, vec![2]);
        buf.add_frame(3000, vec![3]);
        buf.add_frame(4000, vec![4]); // triggers eviction
        assert_eq!(buf.buffered_count(), 3);
        assert!(buf.get_frame(1000).is_none()); // oldest evicted
    }

    #[test]
    fn evict_keeps_newest_frames() {
        let mut buf = FrameBuffer::new();
        buf.fps = 2;
        buf.add_frame(1000, vec![1]);
        buf.add_frame(2000, vec![2]);
        buf.add_frame(3000, vec![3]);
        assert_eq!(buf.get_frame(3000), Some(vec![3]));
    }

    // -----------------------------------------------------------------------
    // parse_message
    // -----------------------------------------------------------------------

    #[test]
    fn parse_message_empty_data_no_panic() {
        let mut buf = FrameBuffer::new();
        parse_message(&[], &mut buf);
        assert_eq!(buf.buffered_count(), 0);
    }

    #[test]
    fn parse_message_unknown_type_no_panic() {
        let mut buf = FrameBuffer::new();
        parse_message(&[0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], &mut buf);
        assert_eq!(buf.buffered_count(), 0);
    }

    #[test]
    fn parse_message_frame_too_short_no_panic() {
        let mut buf = FrameBuffer::new();
        parse_message(&[MSG_FRAME, 0, 0], &mut buf);
        assert_eq!(buf.buffered_count(), 0);
    }

    #[test]
    fn parse_message_valid_frame_adds_to_buffer() {
        let mut buf = FrameBuffer::new();
        let msg = make_frame_msg(1000, 0, &[255, 0, 0]);
        parse_message(&msg, &mut buf);
        assert_eq!(buf.buffered_count(), 1);
    }

    #[test]
    fn parse_message_frame_decodes_timestamp_correctly() {
        let mut buf = FrameBuffer::new();
        let ts: u64 = 1_700_000_000_123;
        let msg = make_frame_msg(ts, 0, &[1, 2, 3]);
        parse_message(&msg, &mut buf);
        assert_eq!(buf.get_frame(ts), Some(vec![1, 2, 3]));
    }

    #[test]
    fn parse_message_frame_decodes_high_32_bit_timestamp() {
        let mut buf = FrameBuffer::new();
        let ts: u64 = 0x1_0000_0000; // non-zero high word
        let msg = make_frame_msg(ts, 0, &[9, 8, 7]);
        parse_message(&msg, &mut buf);
        assert_eq!(buf.get_frame(ts), Some(vec![9, 8, 7]));
    }

    #[test]
    fn parse_message_detects_bpp3_rgb() {
        let mut buf = FrameBuffer::new();
        let pixels = &[10u8, 20, 30]; // 1 pixel × 3 bytes
        let msg = make_frame_msg(1000, 0, pixels);
        parse_message(&msg, &mut buf);
        assert_eq!(buf.get_frame(1000), Some(pixels.to_vec()));
    }

    #[test]
    fn parse_message_detects_bpp4_rgbw() {
        let mut buf = FrameBuffer::new();
        let pixels = &[10u8, 20, 30, 40]; // 1 pixel × 4 bytes
        let msg = make_frame_msg_rgbw(1000, pixels);
        parse_message(&msg, &mut buf);
        let frame = buf.get_frame(1000).unwrap();
        assert_eq!(frame.len(), 4);
    }

    #[test]
    fn parse_message_valid_sync_updates_fps() {
        let mut buf = FrameBuffer::new();
        let msg = make_sync_msg(0, 60);
        parse_message(&msg, &mut buf);
        assert_eq!(buf.fps, 60);
    }

    #[test]
    fn parse_message_sync_removes_frames_at_or_after_timestamp() {
        let mut buf = FrameBuffer::new();
        buf.add_frame(1000, vec![1]);
        buf.add_frame(2000, vec![2]);
        buf.add_frame(3000, vec![3]);
        let msg = make_sync_msg(2000, 30);
        parse_message(&msg, &mut buf);
        assert_eq!(buf.buffered_count(), 1); // only 1000 remains
    }

    #[test]
    fn parse_message_sync_too_short_no_panic() {
        let mut buf = FrameBuffer::new();
        parse_message(&[MSG_SYNC, 0, 0], &mut buf);
        assert_eq!(buf.fps, 30); // unchanged
    }
}
