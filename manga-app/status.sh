#!/bin/bash

# Script de Ayuda Rápida - My Mangas App
# Este script te ayuda a verificar el estado y acceder a la aplicación

echo "======================================"
echo "   MY MANGAS - Ayuda Rápida"
echo "======================================"
echo ""

# Verificar estado de contenedores
echo "📦 Estado de Contenedores:"
sudo docker ps --filter "name=manga" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Verificar logs recientes
echo "📋 Últimos logs de la aplicación:"
sudo docker logs manga_app --tail 5
echo ""

# Verificar conectividad
echo "🔗 Verificando conectividad..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/MyLibreria/)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ La aplicación está respondiendo correctamente"
else
    echo "❌ Error: La aplicación no responde (código: $HTTP_CODE)"
fi
echo ""

# Contar mangas
echo "📚 Estadísticas:"
MANGA_COUNT=$(curl -s http://localhost:3000/MyLibreria/api/mangas | jq 'length')
echo "   Total de mangas: $MANGA_COUNT"
echo ""

# URLs de acceso
echo "🌐 URLs de Acceso:"
echo "   Local:    http://localhost:3000/MyLibreria/"
echo "   Externo:  https://komga.aaleddy.app/MyLibreria/ (después de configurar NGINX)"
echo ""

# Comandos útiles
echo "⚙️  Comandos Útiles:"
echo "   Ver logs en tiempo real:"
echo "   $ sudo docker logs -f manga_app"
echo ""
echo "   Reiniciar aplicación:"
echo "   $ cd /opt/MangaRead/manga-app && sudo docker-compose restart"
echo ""
echo "   Acceder al contenedor:"
echo "   $ sudo docker exec -it manga_app sh"
echo ""

# Estado por lectura
echo "📊 Mangas por Estado:"
curl -s http://localhost:3000/MyLibreria/api/mangas | jq -r '
  group_by(.estadoLectura) | 
  map({
    estado: .[0].estadoLectura, 
    cantidad: length
  }) | 
  .[] | 
  "   \(.estado): \(.cantidad)"
'
echo ""

echo "======================================"
echo "Para más información, consulta:"
echo "  - RESUMEN_CAMBIOS.md"
echo "  - CONFIGURACION_NGINX.md"
echo "======================================"
