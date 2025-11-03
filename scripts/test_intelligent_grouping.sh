#!/bin/bash
# Script de prueba para validar el agrupado inteligente con Gemini

set -e

API_URL="http://localhost:3000/api"
TEST_PDFS="/tmp/test_pdfs"

echo "════════════════════════════════════════════════════"
echo "🧪 PRUEBA DE AGRUPADO INTELIGENTE CON GEMINI"
echo "════════════════════════════════════════════════════"
echo ""

# Verificar que el servidor esté corriendo
if ! curl -s "$API_URL/stats" > /dev/null; then
    echo "❌ ERROR: El servidor no está corriendo en http://localhost:3000"
    exit 1
fi

echo "✅ Servidor disponible"
echo ""

# 1. Subir "The Demon King.pdf"
echo "📚 [1/3] Subiendo: The Demon King.pdf"
RESPONSE1=$(curl -s -X POST "$API_URL/upload" \
    -F "pdf=@$TEST_PDFS/The Demon King.pdf")

SERIES_ID_1=$(echo "$RESPONSE1" | grep -o '"series_id":[0-9]*' | grep -o '[0-9]*')
SERIES_CODE_1=$(echo "$RESPONSE1" | grep -o '"series_code":"[^"]*"' | sed 's/"series_code":"//;s/"//')

echo "   ✓ Serie creada: ID=$SERIES_ID_1, Código=$SERIES_CODE_1"
echo ""

# Esperar 7 segundos (rate limiting)
echo "⏱️  Esperando 7 segundos (rate limiting)..."
sleep 7

# 2. Subir "El Rey Demonio 2.pdf" (debería agruparse con "The Demon King")
echo "📚 [2/3] Subiendo: El Rey Demonio 2.pdf"
echo "   🤖 Gemini debería detectar que es traducción de 'The Demon King'"
RESPONSE2=$(curl -s -X POST "$API_URL/upload" \
    -F "pdf=@$TEST_PDFS/El Rey Demonio 2.pdf")

SERIES_ID_2=$(echo "$RESPONSE2" | grep -o '"series_id":[0-9]*' | grep -o '[0-9]*')
SERIES_CODE_2=$(echo "$RESPONSE2" | grep -o '"series_code":"[^"]*"' | sed 's/"series_code":"//;s/"//')

echo "   ✓ Procesado: ID=$SERIES_ID_2, Código=$SERIES_CODE_2"

# Validar agrupado
if [ "$SERIES_CODE_1" = "$SERIES_CODE_2" ]; then
    echo "   ✅ ¡AGRUPADO CORRECTO! Mismo código de serie"
else
    echo "   ⚠️  Series diferentes: $SERIES_CODE_1 vs $SERIES_CODE_2"
    echo "   (Puede ser correcto si Gemini no detectó la traducción)"
fi
echo ""

# Esperar 7 segundos
echo "⏱️  Esperando 7 segundos (rate limiting)..."
sleep 7

# 3. Subir "Hola Señor con ñ y comas, perfecto.pdf"
echo "📚 [3/3] Subiendo: Hola Señor con ñ y comas, perfecto.pdf"
echo "   🔤 Probando preservación de ñ, acentos y comas"
RESPONSE3=$(curl -s -X POST "$API_URL/upload" \
    -F "pdf=@$TEST_PDFS/Hola Señor con ñ y comas, perfecto.pdf")

SERIES_ID_3=$(echo "$RESPONSE3" | grep -o '"series_id":[0-9]*' | grep -o '[0-9]*')
SERIES_TITLE_3=$(echo "$RESPONSE3" | grep -o '"series_title":"[^"]*"' | sed 's/"series_title":"//;s/"//')

echo "   ✓ Serie creada: ID=$SERIES_ID_3"
echo "   ✓ Título: $SERIES_TITLE_3"

# Verificar que contiene ñ
if echo "$SERIES_TITLE_3" | grep -q "ñ"; then
    echo "   ✅ Carácter 'ñ' preservado correctamente"
else
    echo "   ⚠️  Carácter 'ñ' no encontrado en el título"
fi
echo ""

# Resumen final
echo "════════════════════════════════════════════════════"
echo "📊 RESUMEN DE PRUEBAS"
echo "════════════════════════════════════════════════════"
curl -s "$API_URL/series" | head -50
echo ""
echo "════════════════════════════════════════════════════"
echo "✅ Pruebas completadas"
echo ""
echo "📋 Para ver logs detallados:"
echo "   tail -f logs/server.log | grep -E '(Gemini|Agrupando|🤖)'"
echo "════════════════════════════════════════════════════"
