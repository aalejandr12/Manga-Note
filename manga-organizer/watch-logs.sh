#!/bin/bash

# Script para ver los logs del servidor Manga Organizer en tiempo real

echo "=========================================="
echo "📊 LOGS DE MANGA ORGANIZER EN TIEMPO REAL"
echo "=========================================="
echo ""
echo "Presiona Ctrl+C para salir"
echo ""

tail -f /opt/MangaRead/manga-organizer/server.log
