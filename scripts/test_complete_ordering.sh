#!/bin/bash
# Prueba completa de ordenamiento: Cap sin número (1) + Cap 2 + Cap 3 + Cap 5

set -e

API_URL="http://localhost:3000/api"
TEST_PDFS="/tmp/test_ordering"

echo "════════════════════════════════════════════════════"
echo "🧪 PRUEBA COMPLETA DE ORDENAMIENTO"
echo "════════════════════════════════════════════════════"
echo ""

mkdir -p "$TEST_PDFS"

# Crear PDF simple
create_pdf() {
    local filename="$1"
    cat > "$TEST_PDFS/$filename" <<'EOF'
%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000111 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
203
%%EOF
EOF
}

echo "📝 Creando PDFs..."
create_pdf "Love Story.pdf"          # Sin número = Cap 1
create_pdf "Love Story 2.pdf"        # Cap 2
create_pdf "Love Story 5.pdf"        # Cap 5
create_pdf "Love Story 3.pdf"        # Cap 3

echo "✅ PDFs creados:"
echo "   • Love Story.pdf (sin número → será Cap 1)"
echo "   • Love Story 2.pdf"
echo "   • Love Story 5.pdf"
echo "   • Love Story 3.pdf"
echo ""

# Subir EN DESORDEN para probar el ordenamiento
echo "🔀 SUBIENDO EN ORDEN ALEATORIO:"
echo "════════════════════════════════════════════════════"
echo ""

upload_pdf() {
    local file="$1"
    local delay="$2"
    
    echo "📤 Subiendo: $file"
    RESPONSE=$(curl -s -X POST "$API_URL/upload" -F "pdf=@$TEST_PDFS/$file")
    
    # Extraer info relevante
    CHAPTER=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('analysis',{}).get('chapter_start', '?'))" 2>/dev/null || echo "?")
    TITLE=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('analysis',{}).get('title', '?'))" 2>/dev/null || echo "?")
    
    echo "   ✓ Detectado: Cap $CHAPTER - $TITLE"
    
    if [ -n "$delay" ]; then
        echo "   ⏱️  Esperando ${delay}s..."
        sleep "$delay"
    fi
    echo ""
}

# Subir en orden: 5 → sin número → 2 → 3
upload_pdf "Love Story 5.pdf" 8
upload_pdf "Love Story.pdf" 8        # Este será Cap 1
upload_pdf "Love Story 2.pdf" 8
upload_pdf "Love Story 3.pdf" 8

echo "⏳ Esperando procesamiento final..."
sleep 5

# Obtener resultados
echo ""
echo "════════════════════════════════════════════════════"
echo "📊 ORDEN FINAL EN LA BASE DE DATOS"
echo "════════════════════════════════════════════════════"

SERIES_ID=$(curl -s "$API_URL/series" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])" 2>/dev/null || echo "1")

echo ""
echo "Serie: Love Story (ID: $SERIES_ID)"
echo ""

curl -s "$API_URL/series/$SERIES_ID/volumes" | python3 -c "
import sys, json

try:
    volumes = json.load(sys.stdin)
    
    print(f'Total de volúmenes: {len(volumes)}\n')
    print('Orden en la biblioteca:')
    print('─' * 50)
    
    for i, vol in enumerate(volumes, 1):
        ch_start = vol.get('chapter_start')
        ch_num = vol.get('chapter_number')
        title = vol.get('title', 'Sin título')
        
        ch = ch_start if ch_start is not None else (ch_num if ch_num is not None else '?')
        
        print(f'{i}. Capítulo {ch} - {title}')
        
except Exception as e:
    print(f'Error: {e}')
"

echo ""
echo "════════════════════════════════════════════════════"
echo "✅ VALIDACIÓN"
echo "════════════════════════════════════════════════════"

ACTUAL_ORDER=$(curl -s "$API_URL/series/$SERIES_ID/volumes" | python3 -c "
import sys, json
try:
    volumes = json.load(sys.stdin)
    order = []
    for v in volumes:
        ch = v.get('chapter_start') or v.get('chapter_number') or 0
        order.append(str(ch))
    print(' '.join(order))
except:
    print('ERROR')
" 2>/dev/null)

echo ""
echo "Orden esperado: 1 2 3 5"
echo "Orden obtenido: $ACTUAL_ORDER"
echo ""

if [ "$ACTUAL_ORDER" = "1 2 3 5" ]; then
    echo "✅ ¡ORDENAMIENTO PERFECTO!"
    echo ""
    echo "📝 Resumen:"
    echo "   Subiste:  Cap 5 → Cap sin número → Cap 2 → Cap 3"
    echo "   Sistema:  Cap 1 → Cap 2 → Cap 3 → Cap 5  ✅"
    echo ""
    echo "🎯 El sistema detectó correctamente:"
    echo "   • 'Love Story.pdf' (sin número) = Capítulo 1"
    echo "   • 'Love Story 2.pdf' = Capítulo 2"
    echo "   • 'Love Story 3.pdf' = Capítulo 3"
    echo "   • 'Love Story 5.pdf' = Capítulo 5"
    echo ""
    echo "   Y los ordenó automáticamente: 1 → 2 → 3 → 5"
else
    echo "⚠️  Orden diferente al esperado"
    echo ""
    echo "Análisis:"
    echo "   Esperado: 1 2 3 5"
    echo "   Obtenido: $ACTUAL_ORDER"
fi

echo ""
echo "════════════════════════════════════════════════════"
