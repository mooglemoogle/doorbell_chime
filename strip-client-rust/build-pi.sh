#!/usr/bin/env bash
# Build strip-client for Raspberry Pi (aarch64-linux) using a Docker container.
# Requires OrbStack or Docker Desktop running on Apple Silicon.
set -e
cd "$(dirname "$0")"

echo "Building Docker image (first run downloads deps and compiles rpi_ws281x)..."
docker build -t strip-client-builder -f Dockerfile.build . >&2

echo "Compiling strip-client..."
docker run --rm \
    -v "$(pwd):/app" \
    -e CARGO_TARGET_DIR=/app/.build-cache \
    -w /app \
    strip-client-builder \
    cargo build --release --features hardware

cp .build-cache/release/strip-client strip-client-pi
echo "Done: strip-client-pi  (aarch64-linux)"
