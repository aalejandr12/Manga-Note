#!/usr/bin/env bash

# (Archivado) Script para mantener el servidor corriendo en Termux
# Movido a scripts/android/ para evitar confusiones en despliegues Linux

echo "🔒 Activando wake-lock de Termux..."

# Verificar si termux-wake-lock está disponible
if ! command -v termux-wake-lock &> /dev/null; then
    echo "⚠️  termux-wake-lock no encontrado"
    echo "Instala Termux:API desde F-Droid y ejecuta:"
    echo "  pkg install termux-api"
    echo ""
    echo "Continuando sin wake-lock (menos estable)..."
else
    termux-wake-lock
    echo "✅ Wake-lock activado"
fi

# Iniciar el servidor (ruta relativa al repo)
cd "$(dirname "$0")/.."
./start.sh

echo "💡 El script está archivado. Para producción en Linux usa systemd or scripts/install_linux.sh"
