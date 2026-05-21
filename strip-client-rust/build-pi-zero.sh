#!/usr/bin/env bash
# Build strip-client for Raspberry Pi Zero W (ARMv6, arm-unknown-linux-gnueabihf).
# Requires OrbStack or Docker Desktop.
set -e
cd "$(dirname "$0")"

echo "Building Docker image for ARMv6 cross-compilation..."
docker build -t strip-client-builder-armv6 -f Dockerfile.build-armv6 . >&2

echo "Compiling strip-client for ARMv6..."
docker run --rm \
    -v "$(pwd):/app" \
    -e CARGO_TARGET_DIR=/app/.build-cache-armv6 \
    -w /app \
    strip-client-builder-armv6 \
    cargo build --release --features hardware --target arm-unknown-linux-gnueabihf

cp .build-cache-armv6/arm-unknown-linux-gnueabihf/release/strip-client strip-client-pi-zero
echo "Done: strip-client-pi-zero  (ARMv6 arm-unknown-linux-gnueabihf)"
