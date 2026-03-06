#!/usr/bin/env sh
set -eu

: "${PORT:=8000}"

# Single worker keeps memory usage predictable for Ultralytics model loading.
exec gunicorn --workers 1 --threads 4 --timeout 180 --bind 0.0.0.0:"$PORT" app:app
