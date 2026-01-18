#!/bin/bash

echo "🚀 Iniciando aplicación de gestión de mangas..."
echo ""
echo "📦 Construyendo e iniciando contenedores..."
docker-compose up --build -d

echo ""
echo "⏳ Esperando a que los servicios estén listos..."
sleep 5

echo ""
echo "✅ ¡Aplicación iniciada!"
echo ""
echo "🌐 Accede a la aplicación en: http://localhost:3000"
echo ""
echo "📊 Para ver los logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Para detener la aplicación:"
echo "   docker-compose down"
echo ""
