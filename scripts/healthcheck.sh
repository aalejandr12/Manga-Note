#!/usr/bin/env bash
set -euo pipefail

# Healthcheck para comprobar que la app responde en ${PORT}
PORT=${PORT:-3000}
HOST=${HOST:-localhost}
URL="http://${HOST}:${PORT}/api/stats"

echo "🔎 Healthcheck: ${URL}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${URL}" || true)

if [ "${STATUS}" = "200" ]; then
  echo "✅ OK (${STATUS})"
  exit 0
else
  echo "❌ ERROR: status=${STATUS}"
  exit 2
fi
