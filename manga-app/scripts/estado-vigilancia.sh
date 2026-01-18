#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         📚 ESTADO DE VIGILANCIA DE MANGAS 📚             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "⏰ Configuración del Cron Job:"
sudo docker exec manga_app crontab -l | grep vigilar-mangas || echo "   ❌ No configurado"
echo ""

echo "🔄 Proceso Cron:"
sudo docker exec manga_app ps aux | grep crond | grep -v grep || echo "   ❌ Cron no está corriendo"
echo ""

echo "📊 Estadísticas:"
sudo docker exec manga_db psql -U manga_user -d manga_db -t -c "
SELECT 
  '   Total en vigilancia: ' || COUNT(*) || ' manga(s)'
FROM mangas WHERE \"vigilarManga\" = true;
"

sudo docker exec manga_db psql -U manga_user -d manga_db -t -c "
SELECT 
  '   Con nuevos capítulos: ' || COUNT(*) || ' manga(s)'
FROM mangas WHERE \"tieneNuevosCapitulos\" = true;
"
echo ""

echo "📚 Mangas Vigilados:"
sudo docker exec manga_db psql -U manga_user -d manga_db -t -c "
SELECT 
  '   ' || 
  CASE WHEN \"tieneNuevosCapitulos\" THEN '✨' ELSE '✓' END || 
  ' ' || titulo || ' → ' || COALESCE(\"capitulosDisponibles\", 'Sin datos')
FROM mangas 
WHERE \"vigilarManga\" = true 
ORDER BY \"tieneNuevosCapitulos\" DESC, id;
"
echo ""

echo "📝 Últimas 5 líneas del log:"
sudo docker exec manga_app tail -5 /var/log/vigilancia-mangas.log 2>/dev/null || echo "   (Log vacío)"
echo ""

echo "⏭️  Próxima ejecución: En el minuto 0 de la próxima hora"
echo "📅 Hora actual: $(date '+%Y-%m-%d %H:%M:%S')"
