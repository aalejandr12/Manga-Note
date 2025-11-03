#!/bin/bash
set -e
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

LOG_DIR="$APP_DIR/logs"
PID_FILE="$APP_DIR/manga-app.pid"

mkdir -p "$LOG_DIR"

# Si ya está corriendo, no iniciar otra instancia
if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
  echo "✅ Ya está corriendo (PID $(cat "$PID_FILE"))"
  exit 0
fi

# Wake lock si está disponible (Termux)
if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock || true
fi

# Iniciar en segundo plano
export NODE_ENV=production
nohup node server.js > "$LOG_DIR/server.log" 2>&1 &
PID=$!
echo $PID > "$PID_FILE"

echo "🚀 Servidor iniciado en background (PID $PID)"
echo "📜 Logs: $LOG_DIR/server.log"
exit 0
