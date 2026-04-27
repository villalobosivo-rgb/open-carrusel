#!/bin/sh
# Seed default data files if the mounted volume is empty
set -e

DATA_DIR=/app/data

mkdir -p "$DATA_DIR"

if [ ! -f "$DATA_DIR/brand.json" ]; then
  cp /app/seeds/brand.json "$DATA_DIR/brand.json"
  echo "[entrypoint] Seeded brand.json from defaults"
fi

if [ ! -f "$DATA_DIR/carousels.json" ]; then
  echo '{"carousels":[]}' > "$DATA_DIR/carousels.json"
  echo "[entrypoint] Initialized carousels.json"
fi

exec "$@"
