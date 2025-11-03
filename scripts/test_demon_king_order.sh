#!/bin/bash
# Prueba específica: "The Demon King 2" primero, luego "The Demon King"

set -e

API_URL="http://localhost:3000/api"
TEST_PDFS="/tmp/test_demon_king"

echo "════════════════════════════════════════════════════"
echo "🧪 PRUEBA: The Demon King 2 → The Demon King"
echo "════════════════════════════════════════════════════"
echo ""

# Crear directorio de prueba
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

echo "📝 Creando PDFs de prueba..."
create_pdf "The Demon King 2.pdf"
create_pdf "The Demon King.pdf"
echo "✅ PDFs creados"
echo ""

# Subir en orden: 2 primero, luego 1
echo "📤 [1/2] Subiendo: The Demon King 2.pdf"
RESPONSE1=$(curl -s -X POST "$API_URL/upload" -F "pdf=@$TEST_PDFS/The Demon King 2.pdf")
echo "$RESPONSE1" | python3 -m json.tool | grep -E "(series_id|series_code|title|chapter)" | head -10
echo ""

echo "⏱️  Esperando 8 segundos (rate limiting + procesamiento)..."
sleep 8

echo "📤 [2/2] Subiendo: The Demon King.pdf"
RESPONSE2=$(curl -s -X POST "$API_URL/upload" -F "pdf=@$TEST_PDFS/The Demon King.pdf")
echo "$RESPONSE2" | python3 -m json.tool | grep -E "(series_id|series_code|title|chapter)" | head -10
echo ""

echo "⏱️  Esperando procesamiento IA..."
sleep 10

# Obtener resultados
echo ""
echo "════════════════════════════════════════════════════"
echo "📊 RESULTADOS"
echo "════════════════════════════════════════════════════"

SERIES_ID=$(curl -s "$API_URL/series" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])" 2>/dev/null || echo "1")

echo ""
echo "🔍 Serie completa:"
curl -s "$API_URL/series/$SERIES_ID" | python3 -m json.tool | grep -E "(\"id\"|\"title\"|\"series_code\"|volume_count)" | head -10

echo ""
echo "📚 Volúmenes ordenados:"
curl -s "$API_URL/series/$SERIES_ID/volumes" | python3 -c "
import sys, json
try:
    volumes = json.load(sys.stdin)
    print(f'\nTotal de volúmenes: {len(volumes)}\n')
    for i, vol in enumerate(volumes, 1):
        ch_start = vol.get('chapter_start', '?')
        ch_num = vol.get('chapter_number', '?')
        title = vol.get('title', 'Sin título')
        ch = ch_start if ch_start != '?' and ch_start is not None else (ch_num if ch_num != '?' and ch_num is not None else 'Sin número')
        print(f'{i}. Cap {ch} - {title}')
except Exception as e:
    print(f'Error: {e}')
    print(sys.stdin.read())
"

echo ""
echo "════════════════════════════════════════════════════"
echo "✅ VERIFICACIÓN"
echo "════════════════════════════════════════════════════"

# Verificar orden
ACTUAL_ORDER=$(curl -s "$API_URL/series/$SERIES_ID/volumes" | python3 -c "
import sys, json
try:
    volumes = json.load(sys.stdin)
    order = []
    for v in volumes:
        ch = v.get('chapter_start') or v.get('chapter_number') or 0
        order.append(str(ch) if ch else '0')
    print(' '.join(order))
except:
    print('ERROR')
" 2>/dev/null || echo "ERROR")

# Verificar títulos
TITLES=$(curl -s "$API_URL/series/$SERIES_ID/volumes" | python3 -c "
import sys, json
try:
    volumes = json.load(sys.stdin)
    for v in volumes:
        print(v.get('title', 'N/A'))
except:
    pass
" 2>/dev/null || echo "ERROR")

echo ""
echo "Orden de capítulos: $ACTUAL_ORDER"
echo ""
echo "Títulos:"
echo "$TITLES"
echo ""

# Validación
if [ "$ACTUAL_ORDER" = "1 2" ] || [ "$ACTUAL_ORDER" = "0 2" ]; then
    echo "✅ ORDEN CORRECTO: Cap 1 primero, Cap 2 después"
elif [ "$ACTUAL_ORDER" = "2 1" ]; then
    echo "❌ ERROR: Orden invertido"
elif [ "$ACTUAL_ORDER" = "2 0" ]; then
    echo "⚠️  Cap 2 detectado correctamente, pero falta número en 'The Demon King'"
else
    echo "⚠️  Orden actual: $ACTUAL_ORDER"
fi

# Verificar que ambos tengan el mismo título base
FIRST_TITLE=$(echo "$TITLES" | head -1)
SECOND_TITLE=$(echo "$TITLES" | tail -1)

echo ""
if [[ "$FIRST_TITLE" == *"The Demon King"* ]] && [[ "$SECOND_TITLE" == *"The Demon King"* ]]; then
    # Verificar que no incluyan números en el título
    if [[ "$FIRST_TITLE" =~ [0-9] ]] || [[ "$SECOND_TITLE" =~ [0-9] ]]; then
        echo "⚠️  Los títulos contienen números (deberían ser solo 'The Demon King')"
        echo "   Título 1: $FIRST_TITLE"
        echo "   Título 2: $SECOND_TITLE"
    else
        echo "✅ TÍTULOS CORRECTOS: Sin números, solo 'The Demon King'"
    fi
else
    echo "⚠️  Títulos no coinciden correctamente"
fi

echo ""
echo "════════════════════════════════════════════════════"
