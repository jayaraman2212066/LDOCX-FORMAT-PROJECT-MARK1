#!/usr/bin/env bash
# LDOC — Linux/macOS Release Build Script
# Produces release binaries in dist/linux/ or dist/macos/

set -euo pipefail

DIST="dist/$(uname -s | tr '[:upper:]' '[:lower:]')"

echo "[LDOC] Building release binaries..."
cargo build --release

echo "[LDOC] Copying binaries to $DIST..."
mkdir -p "$DIST"

for bin in ldoc ldoc-view ldoc-server ldoc-runtime; do
    if [ -f "target/release/$bin" ]; then
        cp -f "target/release/$bin" "$DIST/$bin"
        echo "  $bin -> $DIST/$bin"
    fi
done

echo "[LDOC] Running tests..."
cargo test

echo ""
echo "[LDOC] Build complete. Binaries in $DIST/"
echo "  ldoc         — CLI (pack, validate, inspect, view, edit)"
echo "  ldoc-view    — Viewer"
echo "  ldoc-server  — REST API server (port 8080)"
echo "  ldoc-runtime — Runtime CLI"
