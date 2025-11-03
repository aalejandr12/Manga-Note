#!/usr/bin/env bash

# Optimización y arranque preparado para entornos Linux/Termux.
# Ahora detecta el directorio del proyecto dinámicamente y evita rutas hardcodeadas.

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "⚙️  Configurando entorno para Manga Library App (dir: $APP_DIR)"

# Si no está definido, proponer una opción razonable para la memoria
: ${NODE_OPTIONS:="--max-old-space-size=512"}
export NODE_OPTIONS

# Modo producción por defecto
: ${NODE_ENV:=production}
export NODE_ENV

# Timeout HTTP usado por el servidor (si el servidor lo respeta)
: ${HTTP_TIMEOUT:=10000}
export HTTP_TIMEOUT

echo "✅ Variables de entorno configuradas:" 
echo "   NODE_OPTIONS=$NODE_OPTIONS"
echo "   NODE_ENV=$NODE_ENV"
echo "   HTTP_TIMEOUT=$HTTP_TIMEOUT"
echo ""

# Iniciar la app usando npm (respetando scripts definidos en package.json)
if command -v npm >/dev/null 2>&1; then
	exec npm start
else
	echo "❌ npm no encontrado. Instala Node.js y npm antes de continuar."
	exit 1
fi
