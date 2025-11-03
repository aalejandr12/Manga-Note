#!/usr/bin/env bash
set -euo pipefail

# Instalador / despliegue mínimo para Linux (Debian/Ubuntu)
# Idempotente — crea usuario de servicio, directorios, instala dependencias nativas y npm.

APP_NAME="manga-library-app"
APP_DIR="/srv/${APP_NAME}"
SERVICE_USER="svc_manga"
ENV_DIR="/etc/${APP_NAME}"
ENV_FILE="${ENV_DIR}/.env"

echo "🔧 Instalando ${APP_NAME} en ${APP_DIR} como ${SERVICE_USER}"

if ! command -v apt-get >/dev/null 2>&1; then
  echo "❌ apt-get no disponible. Este script está pensado para Debian/Ubuntu." >&2
  exit 1
fi

sudo apt-get update
sudo apt-get install -y nodejs npm build-essential libvips-dev poppler-utils imagemagick rsync

# Crear usuario de servicio si no existe
if ! id -u "${SERVICE_USER}" >/dev/null 2>&1; then
  sudo useradd --system --no-create-home --shell /bin/false "${SERVICE_USER}"
  echo "✓ Usuario ${SERVICE_USER} creado"
else
  echo "✓ Usuario ${SERVICE_USER} ya existe"
fi

# Crear directorio destino
sudo mkdir -p "${APP_DIR}"
sudo chown "$(whoami)":"$(whoami)" "${APP_DIR}"

# Sincronizar el repo actual al directorio de despliegue (excluye .git)
rsync -a --delete --exclude '.git' --exclude 'node_modules' ./ "${APP_DIR}/"

# Instalar dependencias Node en APP_DIR
pushd "${APP_DIR}"
if [ -f package.json ]; then
  echo "📦 Instalando dependencias npm..."
  npm install --production
else
  echo "⚠ package.json no encontrado en ${APP_DIR}"
fi
popd

# Crear directorios para uploads y logs
sudo mkdir -p "${APP_DIR}/uploads/covers" "${APP_DIR}/logs" "${APP_DIR}/database"
sudo chown -R "${SERVICE_USER}":"${SERVICE_USER}" "${APP_DIR}"
sudo chmod -R 750 "${APP_DIR}"

# Crear directorio y .env si no existe
sudo mkdir -p "${ENV_DIR}"
if [ ! -f "${ENV_FILE}" ]; then
  echo "Creando archivo de entorno de ejemplo en ${ENV_FILE}" 
  sudo cp "${APP_DIR}/.env.example" "${ENV_FILE}" || sudo bash -c "echo 'PORT=3000' > ${ENV_FILE}"
  sudo chown root:"${SERVICE_USER}" "${ENV_FILE}"
  sudo chmod 640 "${ENV_FILE}"
fi

echo "✅ Instalación inicial completada. Ajusta ${ENV_FILE} y habilita el servicio systemd." 
echo "Sugerencia: sudo cp deploy/systemd/manga-library-app.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now manga-library-app"
