# PROMPT PARA GENERAR APP DE PORTADAS DE MANGA

## Contexto del Proyecto

Tengo una aplicación web de biblioteca de mangas en Node.js + Express con:
- Backend: Node.js, Express, SQLite (sql.js)
- Frontend: HTML, JavaScript vanilla, Tailwind CSS
- Almacenamiento: PDFs en carpeta `uploads/`, portadas en `uploads/covers/`
- API REST en `http://localhost:3000`

## Objetivo

Necesito una aplicación **standalone ejecutable** (preferiblemente .exe para Windows) que:

1. Se conecte al servidor de la biblioteca (puede estar en otra máquina/red local)
2. Detecte qué series de manga NO tienen portada física
3. Para cada serie sin portada:
   - Obtenga el primer volumen/capítulo
   - Extraiga la primera página del PDF
   - La convierta a imagen JPEG de alta calidad
   - La suba al servidor como portada definitiva
4. Muestre progreso en consola con mensajes claros
5. No deje rastros (cache, archivos temporales, etc.)
6. Se ejecute una vez y termine limpiamente

## Estructura de la API del Servidor

### GET /api/series
Retorna array de series:
```json
[{
  "id": 1,
  "title": "Nombre del Manga",
  "cover_image": "pdf:2:1",  // ← Referencia PDF (necesita conversión)
  "cover_source": "pdf_page"
}]
```

Si `cover_image` empieza con `"pdf:"` significa que NO tiene portada física y usa formato:
`pdf:volumeId:pageNumber`

### GET /api/volumes/:id
Retorna info del volumen:
```json
{
  "id": 2,
  "series_id": 1,
  "file_path": "/uploads/manga-vol1.pdf",
  "title": "Capítulo 1"
}
```

### POST /api/series/:id/cover
Sube portada. Acepta multipart/form-data con campo `image`:
```javascript
FormData: {
  image: <archivo JPEG>
}
```

Retorna:
```json
{
  "success": true,
  "cover_image": "uploads/covers/cover-123.jpg"
}
```

## Requisitos Técnicos

### Debe funcionar:
- ✅ En Windows (preferible .exe standalone)
- ✅ Sin instalar Node.js (binario embebido)
- ✅ Conectarse a servidor remoto via IP (ej: `http://192.168.1.100:3000`)
- ✅ Usar herramientas del sistema para extraer PDFs: ImageMagick, MuPDF, Poppler o Ghostscript

### Interfaz:
```
════════════════════════════════════════════════════════════
📚 GENERADOR DE PORTADAS - MANGA LIBRARY
════════════════════════════════════════════════════════════

🔍 Conectando al servidor...
📡 URL: http://192.168.1.100:3000
✅ Conectado. Series encontradas: 5
📋 Series sin portada: 2

📊 [1/2] Procesando: Naruto
📚   Obteniendo volumen...
🖼️   Extrayendo primera página...
📤   Subiendo portada...
✅   Completado

📊 [2/2] Procesando: One Piece
📚   Obteniendo volumen...
🖼️   Extrayendo primera página...
📤   Subiendo portada...
✅   Completado

════════════════════════════════════════════════════════════
✨ PROCESO COMPLETADO
════════════════════════════════════════════════════════════
✅ Exitosas: 2
❌ Fallidas: 0
════════════════════════════════════════════════════════════

Presiona cualquier tecla para salir...
```

## Flujo de la Aplicación

1. **Configuración**
   - Leer variable de entorno `SERVER_URL` (default: `http://localhost:3000`)
   - Crear directorio temporal único

2. **Conexión**
   - GET `/api/series`
   - Filtrar las que tengan `cover_image` que empiece con `"pdf:"`

3. **Procesamiento** (para cada serie)
   - Parsear referencia: `pdf:volumeId:pageNumber`
   - GET `/api/volumes/:volumeId`
   - Construir ruta absoluta al PDF
   - Extraer página usando herramienta disponible:
     * ImageMagick: `convert -density 150 "archivo.pdf[0]" -quality 90 output.jpg`
     * MuPDF: `mutool draw -o output.jpg -r 150 -F jpeg "archivo.pdf" 1`
     * Poppler: `pdftoppm -jpeg -f 1 -l 1 -r 150 "archivo.pdf" output`
     * Ghostscript: `gs -dNOPAUSE -dBATCH -sDEVICE=jpeg -r150 -dFirstPage=1 -dLastPage=1 -sOutputFile=output.jpg "archivo.pdf"`
   - POST `/api/series/:id/cover` con la imagen generada
   - Eliminar imagen temporal

4. **Limpieza**
   - Borrar directorio temporal completo
   - Mostrar resumen
   - Terminar proceso

## Tecnologías Sugeridas

### Opción 1: Node.js + pkg
- Usar `pkg` para compilar a .exe
- HTTP con módulo nativo `http/https`
- Ejecutar comandos con `child_process.execSync()`
- Tamaño: ~50MB

### Opción 2: Go
- Compilar a binario nativo pequeño
- HTTP con `net/http`
- Ejecutar comandos con `os/exec`
- Tamaño: ~5-10MB

### Opción 3: Python + PyInstaller
- Compilar con PyInstaller
- HTTP con `requests`
- PDF con `subprocess` (llamar a ImageMagick)
- Tamaño: ~20-30MB

### Opción 4: C# / .NET
- Compilar con `dotnet publish` single-file
- HTTP con `HttpClient`
- PDF con Process para comandos externos
- Tamaño: ~30-40MB

## Consideraciones Importantes

1. **Rutas de archivos**
   - El servidor puede estar en otra máquina
   - Los PDFs están en el sistema de archivos del servidor, NO de la app
   - Por eso la app debe ejecutarse en la misma máquina que el servidor
   - O copiar el PDF temporalmente vía HTTP (más complejo)

2. **Detección de herramientas**
   - Verificar qué está instalado: ImageMagick, MuPDF, etc.
   - Usar la primera disponible
   - Si ninguna está disponible, mostrar error con instrucciones de instalación

3. **Manejo de errores**
   - Timeout de red (30 segundos)
   - PDF corrupto o sin páginas
   - Herramientas no instaladas
   - Servidor no disponible
   - No mostrar stack traces al usuario, solo mensajes claros

4. **Sin rastros**
   - Directorio temporal debe tener nombre único (timestamp)
   - Eliminar SIEMPRE en `finally` o `defer`
   - No guardar configuración persistente
   - No crear logs permanentes

## Entrega Esperada

1. **Código fuente** completo y comentado
2. **Instrucciones de compilación** paso a paso
3. **Ejecutable compilado** para Windows (.exe)
4. **README** con:
   - Requisitos (ImageMagick, etc.)
   - Cómo ejecutar
   - Cómo configurar servidor remoto
   - Troubleshooting común

## Ejemplo de Uso Final

```bash
# Windows
PortadaMangaLibrary.exe

# Con servidor remoto
set SERVER_URL=http://192.168.1.100:3000
PortadaMangaLibrary.exe

# Linux/Mac
SERVER_URL=http://192.168.1.100:3000 ./portada-manga-library
```

## Bonus (Opcional)

- Progress bar visual en consola
- Colores en los mensajes (verde=éxito, rojo=error)
- Mostrar tamaño de las imágenes generadas
- Opción `--dry-run` para simular sin subir
- Opción `--verbose` para debug
- Guardar reporte de errores en archivo solo si fallan

---

**Genera la aplicación completa con estas especificaciones.**
