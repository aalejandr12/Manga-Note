#!/bin/bash

# ═══════════════════════════════════════════════════════════
# KEEP-ALIVE: Mantiene el servidor corriendo siempre
# ═══════════════════════════════════════════════════════════

cd /home/dev/manga-library-app

# Matar cualquier instancia previa
pkill -f "node server.js" 2>/dev/null

echo "════════════════════════════════════════════════════════════"
echo "🔄 KEEP-ALIVE: Servidor con reinicio automático"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "El servidor se reiniciará automáticamente si se cae"
echo "Presiona Ctrl+C para detener"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Contador de reinicios
RESTART_COUNT=0

# Loop infinito
while true; do
    if [ $RESTART_COUNT -gt 0 ]; then
        echo ""
        echo "⚠️  Servidor caído - Reiniciando (#$RESTART_COUNT)..."
        echo ""
    fi
    
    # Iniciar servidor
    npm start
    
    # Si npm start termina, incrementar contador
    RESTART_COUNT=$((RESTART_COUNT + 1))
    
    # Esperar 2 segundos antes de reiniciar
    echo ""
    echo "💤 Esperando 2 segundos antes de reiniciar..."
    sleep 2
done
