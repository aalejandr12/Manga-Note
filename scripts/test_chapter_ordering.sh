#!/bin/bash
# Script para probar el ordenamiento automático de capítulos

set -e

API_URL="http://localhost:3000/api"
TEST_PDFS="/tmp/test_pdfs"

echo "════════════════════════════════════════════════════"
echo "🧪 PRUEBA DE ORDENAMIENTO AUTOMÁTICO DE CAPÍTULOS"
echo "════════════════════════════════════════════════════"
echo ""

# Verificar servidor
if ! curl -s "$API_URL/stats" > /dev/null; then
    echo "❌ ERROR: Servidor no disponible"
    exit 1
fi

# Crear PDFs de prueba con números de capítulo
echo "📝 Creando PDFs de prueba..."
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

create_pdf "My Manga - Cap 5.pdf"
create_pdf "My Manga - Cap 2.pdf"
create_pdf "My Manga - Cap 1.pdf"
create_pdf "My Manga - Cap 3.pdf"

echo "✅ PDFs creados"
echo ""

# Función para subir y esperar
upload_and_wait() {
    local file="$1"
    local delay="$2"
    
    echo "📤 Subiendo: $file"
    RESPONSE=$(curl -s -X POST "$API_URL/upload" -F "pdf=@$TEST_PDFS/$file")
    
    SERIES_ID=$(echo "$RESPONSE" | grep -o '"series_id":[0-9]*' | grep -o '[0-9]*')
    echo "   ✓ Serie ID: $SERIES_ID"
    
    if [ -n "$delay" ]; then
        echo "   ⏱️  Esperando ${delay}s..."
        sleep "$delay"
    fi
    echo ""
}

# Subir en ORDEN INCORRECTO (5, 2, 1, 3)
echo "🔀 SUBIENDO EN DESORDEN: Cap 5 → Cap 2 → Cap 1 → Cap 3"
echo "════════════════════════════════════════════════════"
echo ""

upload_and_wait "My Manga - Cap 5.pdf" 7
upload_and_wait "My Manga - Cap 2.pdf" 7
upload_and_wait "My Manga - Cap 1.pdf" 7
upload_and_wait "My Manga - Cap 3.pdf" 7

# Esperar procesamiento final
echo "⏳ Esperando procesamiento final..."
sleep 5
echo ""

# Obtener volúmenes ordenados
echo "════════════════════════════════════════════════════"
echo "📊 RESULTADO: Orden Final en la Base de Datos"
echo "════════════════════════════════════════════════════"

# Obtener ID de la serie
SERIES_ID=$(curl -s "$API_URL/series" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$SERIES_ID" ]; then
    echo "❌ No se encontró la serie"
    exit 1
fi

# Obtener volúmenes
echo ""
echo "Serie ID: $SERIES_ID"
echo ""
echo "Volúmenes (orden en base de datos):"
echo "───────────────────────────────────"

VOLUMES=$(curl -s "$API_URL/series/$SERIES_ID/volumes")

# Extraer y mostrar orden
echo "$VOLUMES" | python3 -c "
import sys, json
try:
    volumes = json.load(sys.stdin)
    for i, vol in enumerate(volumes, 1):
        ch_start = vol.get('chapter_start', '?')
        ch_end = vol.get('chapter_end', ch_start)
        title = vol.get('title', 'Sin título')
        if ch_start == ch_end:
            print(f'{i}. Capítulo {ch_start} - {title}')
        else:
            print(f'{i}. Capítulos {ch_start}-{ch_end} - {title}')
except Exception as e:
    print(f'Error: {e}')
    print(sys.stdin.read())
"

echo ""
echo "════════════════════════════════════════════════════"
echo "✅ VERIFICACIÓN"
echo "════════════════════════════════════════════════════"

# Verificar orden correcto (debería ser 1, 2, 3, 5)
EXPECTED_ORDER="1 2 3 5"
ACTUAL_ORDER=$(echo "$VOLUMES" | python3 -c "
import sys, json
try:
    volumes = json.load(sys.stdin)
    order = [str(v.get('chapter_start', 0)) for v in volumes]
    print(' '.join(order))
except:
    print('ERROR')
")

echo ""
echo "Orden esperado:  Cap $EXPECTED_ORDER"
echo "Orden obtenido:  Cap $ACTUAL_ORDER"
echo ""

if [ "$ACTUAL_ORDER" = "$EXPECTED_ORDER" ]; then
    echo "✅ ¡ORDENAMIENTO CORRECTO!"
    echo ""
    echo "📝 Resultado:"
    echo "   Subiste:  Cap 5 → Cap 2 → Cap 1 → Cap 3"
    echo "   Sistema:  Cap 1 → Cap 2 → Cap 3 → Cap 5  ✅"
else
    echo "⚠️  Orden diferente al esperado"
fi

echo ""
echo "════════════════════════════════════════════════════"
