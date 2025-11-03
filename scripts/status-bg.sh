#!/bin/bash
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$APP_DIR/manga-app.pid"
LOG_FILE="$APP_DIR/logs/server.log"

if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
  echo "🟢 Servidor en ejecución (PID $(cat "$PID_FILE"))"
else
  echo "🔴 Servidor detenido"
fi

if [ -f "$LOG_FILE" ]; then
  echo "\nÚltimas 20 líneas de log:"
  tail -n 20 "$LOG_FILE"
else
  echo "\n(No hay logs aún)"
fi
