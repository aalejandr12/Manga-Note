#!/bin/bash

# ═══════════════════════════════════════════════════════════
# KEEPALIVE - Mantiene el servidor Node siempre corriendo
# ═══════════════════════════════════════════════════════════

echo "🔄 Iniciando servidor con auto-reinicio..."

cd /home/dev/manga-library-app

while true; do
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "▶️  Iniciando servidor... $(date)"
    echo "═══════════════════════════════════════════════════════"
    
    # Iniciar servidor
    npm start
    
    # Si el servidor se cae, esperar 3 segundos y reiniciar
    echo ""
    echo "⚠️  Servidor detenido. Reiniciando en 3 segundos..."
    sleep 3
done
