#!/bin/bash

echo "🚀 Iniciando Manga Library App..."
echo ""

# Verificar si node está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    echo "Por favor ejecuta primero: ./install.sh"
    exit 1
fi

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "⚠ Dependencias no instaladas"
    echo "Ejecutando instalación..."
    npm install
fi

# Detener instancia previa si existe
if [ -f manga-app.pid ]; then
    OLD_PID=$(cat manga-app.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "⏹️  Deteniendo servidor anterior (PID: $OLD_PID)..."
        kill $OLD_PID
        sleep 1
    fi
    rm -f manga-app.pid
fi

# Crear directorio de logs si no existe
mkdir -p logs

# Iniciar servidor en background con nohup para sobrevivir cierre de terminal
echo "═══════════════════════════════════════════════════════"
echo "🚀 Iniciando servidor en segundo plano..."

# En Termux, usar setsid para desacoplar del terminal
if command -v setsid &> /dev/null; then
    setsid nohup node server.js > logs/server.log 2>&1 &
else
    nohup node server.js > logs/server.log 2>&1 &
fi

SERVER_PID=$!
echo $SERVER_PID > manga-app.pid

# Esperar a que el servidor arranque
sleep 2

# Verificar que el servidor esté corriendo
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "✅ Servidor iniciado correctamente"
    echo "📝 PID: $SERVER_PID"
    echo "📋 Logs: logs/server.log"
    echo "🌐 URL: http://localhost:3000"
    echo ""
    echo "💡 Comandos útiles:"
    echo "   Ver logs:     tail -f logs/server.log"
    echo "   Ver estado:   ./scripts/status.sh"
    echo "   Detener:      ./scripts/stop.sh"
    echo ""
    echo "⚠️  IMPORTANTE EN TERMUX:"
    echo "   - Mantén Termux en primer plano o usa 'termux-wake-lock'"
    echo "   - Desactiva optimización de batería para Termux"
    echo "   - Usa 'termux-wake-lock' para evitar que Android mate el proceso"
else
    echo "❌ Error al iniciar el servidor"
    echo "📋 Revisa los logs: logs/server.log"
    rm -f manga-app.pid
    exit 1
fi
