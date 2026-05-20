#!/bin/sh
# ─── Smart startup — finds libuuid.so.1 automatically ─────────────────────────
LIBUUID=""

# Nix store (Railway with nixpacks)
LIBUUID_NIX=$(find /nix/store -name "libuuid.so.1" 2>/dev/null | head -1)
if [ -n "$LIBUUID_NIX" ]; then
  LIBUUID="$LIBUUID_NIX"
fi

# Debian/Ubuntu standard path
if [ -z "$LIBUUID" ] && [ -f "/usr/lib/x86_64-linux-gnu/libuuid.so.1" ]; then
  LIBUUID="/usr/lib/x86_64-linux-gnu/libuuid.so.1"
fi

# ARM / other architectures
if [ -z "$LIBUUID" ] && [ -f "/usr/lib/aarch64-linux-gnu/libuuid.so.1" ]; then
  LIBUUID="/usr/lib/aarch64-linux-gnu/libuuid.so.1"
fi

# Fallback — ldconfig
if [ -z "$LIBUUID" ]; then
  LIBUUID=$(ldconfig -p 2>/dev/null | grep "libuuid.so.1" | awk '{print $NF}' | head -1)
fi

if [ -n "$LIBUUID" ]; then
  echo "[start.sh] Using LD_PRELOAD=$LIBUUID"
  export LD_PRELOAD="$LIBUUID"
else
  echo "[start.sh] libuuid.so.1 not found — running without LD_PRELOAD"
fi

exec node src/index.js
