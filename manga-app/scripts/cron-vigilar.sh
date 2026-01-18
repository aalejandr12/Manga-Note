#!/bin/bash
# Script para ejecutar vigilancia de mangas desde cron
# Se ejecuta automáticamente cada hora

# Directorio de la aplicación
APP_DIR="/opt/MangaRead/manga-app"

# Log file
LOG_FILE="$APP_DIR/logs/vigilancia-cron.log"
mkdir -p "$APP_DIR/logs"

# Lock file para evitar ejecuciones simultáneas
LOCK_FILE="$APP_DIR/logs/vigilancia.lock"

# Verificar si ya hay una ejecución en proceso
if [ -f "$LOCK_FILE" ]; then
    LOCK_PID=$(cat "$LOCK_FILE")
    if ps -p "$LOCK_PID" > /dev/null 2>&1; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ⚠️  Ya hay una vigilancia en proceso (PID: $LOCK_PID)" >> "$LOG_FILE"
        exit 0
    else
        # El proceso ya no existe, eliminar lock obsoleto
        rm -f "$LOCK_FILE"
    fi
fi

# Crear lock file con el PID actual
echo $$ > "$LOCK_FILE"

# Función para limpiar el lock al salir
cleanup() {
    rm -f "$LOCK_FILE"
}
trap cleanup EXIT INT TERM

# Timestamp
echo "========================================" >> "$LOG_FILE"
echo "⏰ $(date '+%Y-%m-%d %H:%M:%S') - Iniciando vigilancia automática" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Verificar que el contenedor esté corriendo
if ! sudo docker ps | grep -q manga_app; then
    echo "❌ Error: Contenedor manga_app no está corriendo" >> "$LOG_FILE"
    exit 1
fi

# Ejecutar el script de vigilancia
cd "$APP_DIR"
sudo docker exec manga_app node scripts/vigilar-mangas.js >> "$LOG_FILE" 2>&1

# Guardar el código de salida
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Vigilancia completada exitosamente" >> "$LOG_FILE"
else
    echo "❌ Error en vigilancia (código: $EXIT_CODE)" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"

# Mantener solo los últimos 1000 líneas del log
tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"

exit $EXIT_CODE
