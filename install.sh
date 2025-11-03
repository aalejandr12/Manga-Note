#!/bin/bash

echo "═══════════════════════════════════════════════════════"
echo "📚 INSTALADOR DE MANGA LIBRARY APP"
echo "═══════════════════════════════════════════════════════"
echo ""

# Verificar si estamos en Termux
if [ -n "$TERMUX_VERSION" ]; then
    echo "✓ Detectado: Termux (Android)"
    IS_TERMUX=true
else
    echo "✓ Detectado: Sistema Linux/Unix"
    IS_TERMUX=false
fi

echo ""
echo "Paso 1: Verificando Node.js..."

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "✗ Node.js no está instalado"
    
    if [ "$IS_TERMUX" = true ]; then
        echo "Instalando Node.js en Termux..."
        pkg update -y
        pkg install nodejs -y
    else
        echo "❌ Por favor instala Node.js manualmente:"
        echo "   Ubuntu/Debian: sudo apt install nodejs npm"
        echo "   macOS: brew install node"
        echo "   O descarga desde: https://nodejs.org"
        exit 1
    fi
else
    echo "✓ Node.js ya está instalado ($(node --version))"
fi

echo ""
echo "Paso 2: Verificando npm..."
if command -v npm &> /dev/null; then
    echo "✓ npm está instalado ($(npm --version))"
else
    echo "✗ npm no encontrado"
    exit 1
fi

echo ""
echo "Paso 3: Instalando dependencias del proyecto..."
npm install

if [ $? -eq 0 ]; then
    echo "✓ Dependencias instaladas correctamente"
else
    echo "✗ Error al instalar dependencias"
    exit 1
fi

echo ""
echo "Paso 4: Configurando permisos..."

# Crear carpetas si no existen
mkdir -p database uploads

# En Termux, configurar acceso al almacenamiento
if [ "$IS_TERMUX" = true ]; then
    echo "⚠ IMPORTANTE: Para acceder a tus PDFs desde el almacenamiento"
    echo "   ejecuta en Termux: termux-setup-storage"
    echo "   (Esto te pedirá permiso para acceder a archivos)"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ INSTALACIÓN COMPLETADA"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📝 Configuración de API Key:"
echo "   Tu API key ya está configurada en el archivo .env"
echo "   También puedes cambiarla desde la web en Configuración"
echo ""
echo "🚀 Para iniciar el servidor:"
echo "   npm start"
echo ""
echo "🌐 Luego abre en tu navegador:"
echo "   http://localhost:3000"
echo ""
if [ "$IS_TERMUX" = true ]; then
    echo "💡 Tips para Termux:"
    echo "   • Mantén Termux abierto mientras usas la app"
    echo "   • Usa 'termux-wake-lock' para evitar que se duerma"
    echo "   • Para cerrar el servidor: Ctrl+C"
    echo ""
fi
echo "═══════════════════════════════════════════════════════"
