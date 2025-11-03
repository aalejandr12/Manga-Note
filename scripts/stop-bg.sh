#!/bin/bash
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$APP_DIR/manga-app.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 $PID 2>/dev/null; then
    kill $PID
    # Esperar a que termine
    for i in {1..10}; do
      if kill -0 $PID 2>/dev/null; then
        sleep 0.3
      else
        break
      fi
    done
    rm -f "$PID_FILE"
    echo "🛑 Servidor detenido (PID $PID)"
  else
    rm -f "$PID_FILE"
    echo "ℹ️ PID no activo, limpiado"
  fi
else
  echo "ℹ️ No hay PID, el servidor no parece estar en ejecución"
fi

# Liberar wake lock si existe
if command -v termux-wake-unlock >/dev/null 2>&1; then
  termux-wake-unlock || true
fi
