# 🧪 Guía de Pruebas - Manga Library App

## ✅ Verificación de Instalación

### 1. Verificar que el servidor esté corriendo
```bash
cd /home/dev/manga-library-app
npm run status:bg
```

**Salida esperada:**
```
🟢 Servidor en ejecución (PID XXXXX)
```

### 2. Ver logs en tiempo real
```bash
tail -f logs/server.log
```

### 3. Verificar Gemini está configurado
Los logs deben mostrar:
```
✓ Servicio Gemini inicializado
```

---

## 🎯 Pruebas Funcionales

### Test 1: Subir PDF con Rango de Capítulos

**Archivos de prueba recomendados:**
- `Given (1-30).pdf`
- `Killing Stalking Cap 5-15.pdf`
- `Naruto Capitulos 1 al 50.pdf`

**Pasos:**
1. Ir a: `http://localhost:3000/upload` (o tu IP Tailscale)
2. Arrastrar un PDF con formato de rango
3. Hacer clic en "Subir a Biblioteca"

**Resultados esperados:**
- ✅ Gemini detecta título, capítulo_start y capítulo_end
- ✅ Se muestra progreso de subida
- ✅ Mensaje de éxito: "✓ [Título] - Agregado a biblioteca"
- ✅ Redirección automática a biblioteca

**En los logs verás:**
```
📚 Procesando: Given (1-30).pdf
📊 Análisis: {
  title: 'Given',
  chapter_start: 1,
  chapter_end: 30,
  genre: 'yaoi'
}
🔍 Obteniendo metadata...
📖 Metadata: {
  official_title: 'Given',
  author: 'Natsuki Kizu',
  ...
}
🖼️ Buscando portada...
✨ Nueva serie creada: Given
```

---

### Test 2: Verificar Metadata Completa

**Pasos:**
1. Después de subir un PDF, ir a biblioteca
2. Hacer clic en la serie recién creada

**Resultados esperados:**
- ✅ Modal muestra:
  - Portada de la serie (o placeholder con color)
  - Autor: "Natsuki Kizu" (ejemplo)
  - Descripción breve
  - Etiquetas: [yaoi] [5 volúmenes]

---

### Test 3: Subir Múltiples Volúmenes de la Misma Serie

**Archivos de prueba:**
- `Given Vol 1.pdf`
- `Given Vol 2.pdf`
- `Given Vol 3.pdf`

**Pasos:**
1. Seleccionar los 3 PDFs a la vez (o arrastrar)
2. Subir todos

**Resultados esperados:**
- ✅ Primer PDF: Crea nueva serie + metadata
- ✅ PDFs 2 y 3: Se agregan a la misma serie
- ✅ En biblioteca: Se ve como carpeta apilada con "3 vols"

---

### Test 4: Vista de Carpeta para Series

**Pasos:**
1. Ir a biblioteca
2. Localizar serie con múltiples volúmenes
3. Hacer clic en la serie

**Resultados esperados:**
- ✅ Se abre modal con:
  - Portada de la serie
  - Lista de todos los volúmenes
  - Cada volumen muestra:
    - Mini-icono PDF
    - Título del volumen
    - Información de capítulo/volumen
    - Estado (sin leer/leyendo/completado)
    - Barra de progreso si está empezado

---

### Test 5: Abrir Lector Directamente

**Caso A: Serie con un solo volumen**
1. Hacer clic en serie de un volumen
**Resultado:** Se abre el lector directamente

**Caso B: Serie con múltiples volúmenes**
1. Hacer clic en serie
2. Se abre modal
3. Hacer clic en cualquier volumen
**Resultado:** Se abre el lector de ese volumen

---

### Test 6: Progreso de Lectura

**Pasos:**
1. Abrir un manga en el lector
2. Avanzar varias páginas
3. Cerrar el lector
4. Volver a biblioteca
5. Abrir modal de la serie

**Resultados esperados:**
- ✅ Estado cambia de ○ (sin leer) a ⏱ (leyendo)
- ✅ Barra de progreso muestra % leído
- ✅ Si llegas a la última página: ✓ (completado)

---

### Test 7: Filtros de Biblioteca

**Pasos:**
1. En biblioteca, hacer clic en diferentes filtros:
   - [Todos]
   - [Yaoi]
   - [Manga]
   - [Leyendo]
   - [Completados]

**Resultados esperados:**
- ✅ Solo se muestran series que coinciden con el filtro
- ✅ Chip del filtro activo se resalta en color primario

---

### Test 8: Búsqueda de Series

**Pasos:**
1. En biblioteca, escribir en la búsqueda: "given"

**Resultados esperados:**
- ✅ Solo aparecen series con "given" en el título
- ✅ Búsqueda en tiempo real (sin botón)
- ✅ Case-insensitive

---

### Test 9: Subida Sin Límite de Tamaño

**Pasos:**
1. Intentar subir un PDF > 50MB (antes bloqueaba)

**Resultados esperados:**
- ✅ Se permite la subida
- ✅ No hay mensaje de error de tamaño
- ✅ Progreso se muestra normalmente

---

### Test 10: Portadas

**Verificar diferentes fuentes:**

**A. Portada desde Internet**
- Subir un manga famoso (Given, Naruto, One Piece)
- Verificar que intenta buscar portada online

**B. Placeholder**
- Subir un manga poco conocido
- Verificar que usa placeholder con color único
- El color debe ser consistente para el mismo título

---

## 🐛 Problemas Comunes y Soluciones

### Problema: "Gemini API no configurada"

**Solución:**
```bash
# Verificar archivo .env
cat .env

# Debe contener:
GEMINI_API_KEY=tu_api_key_real

# Si no está, configurar desde UI:
# 1. Ir a /settings
# 2. Ingresar API key
# 3. Guardar
```

---

### Problema: No aparecen metadata (autor, descripción)

**Causa:** Gemini toma unos segundos en responder

**Solución:**
- Esperar 5-10 segundos después de subir
- Verificar en logs si hay errores de Gemini
- Recargar la página de biblioteca

---

### Problema: Portadas no se cargan

**Causa:** Internet lento o portada no disponible

**Solución:**
- El sistema automáticamente usa placeholder
- Puedes agregar manualmente portada después
- Verificar que carpeta `uploads/covers/` existe

---

### Problema: PDF no se detecta correctamente

**Ejemplo:** "Given Vol 1.pdf" detectado como "Given Vol pdf"

**Solución:**
- El nombre debe seguir patrones reconocidos:
  ✅ `Given Vol 1.pdf`
  ✅ `Given - Volumen 1.pdf`
  ✅ `Given Tomo 01.pdf`
  ❌ `given_v1.pdf` (guión bajo puede confundir)

---

## 📊 Verificar Base de Datos

### Ver series creadas
```bash
sqlite3 database/manga_library.db "SELECT id, title, author, genre FROM series;"
```

### Ver volúmenes
```bash
sqlite3 database/manga_library.db "SELECT id, title, chapter_start, chapter_end FROM volumes;"
```

### Ver metadata completa de una serie
```bash
sqlite3 database/manga_library.db "SELECT * FROM series WHERE id = 1;"
```

---

## 🔍 Debugging

### Ver logs completos
```bash
cat logs/server.log
```

### Ver últimas 50 líneas
```bash
tail -n 50 logs/server.log
```

### Buscar errores en logs
```bash
grep -i "error" logs/server.log
```

### Ver análisis de Gemini
```bash
grep "📊 Análisis:" logs/server.log
```

---

## ✨ Características Avanzadas para Probar

### 1. Subida Múltiple Secuencial
- Seleccionar 10+ PDFs a la vez
- Observar que se procesan uno por uno
- Cada uno muestra su propio progreso

### 2. Mezcla de Géneros
- Subir PDFs de yaoi y manga regular
- Filtrar por género
- Verificar que se separan correctamente

### 3. Series con Nombres Similares
- Subir "Naruto Vol 1" y "Naruto Shippuden Vol 1"
- Verificar que Gemini los detecta como series diferentes

### 4. Rangos de Capítulos Mixtos
- Subir:
  - "Given Vol 1.pdf" (volumen entero)
  - "Given Cap 5-10.pdf" (rango)
  - "Given Cap 15.pdf" (capítulo individual)
- Verificar que todos se organizan en la misma serie

---

## 🎉 Checklist Final de Funcionalidad

- [ ] ✅ Servidor corriendo en background
- [ ] ✅ Gemini API configurada
- [ ] ✅ Subida de PDFs sin límite de tamaño
- [ ] ✅ Detección de rangos de capítulos (1-30)
- [ ] ✅ Metadata completa (autor, año, descripción)
- [ ] ✅ Portadas automáticas o placeholders
- [ ] ✅ Vista de carpeta para series múltiples
- [ ] ✅ Clic en volumen abre lector
- [ ] ✅ Progreso de lectura guardado
- [ ] ✅ Filtros funcionando (Todos, Yaoi, Manga, etc.)
- [ ] ✅ Búsqueda en tiempo real
- [ ] ✅ Modal con información completa de series
- [ ] ✅ Estadísticas actualizadas
- [ ] ✅ Responsive para móvil/tablet

---

## 📱 Acceso Remoto (Tailscale)

### Obtener IP de Tailscale
```bash
tailscale ip -4
```

### Acceder desde otro dispositivo
```
http://[TU-IP-TAILSCALE]:3000
```

Ejemplo:
```
http://100.79.185.4:3000
```

### Verificar conexión
```bash
# Desde otro dispositivo en Tailscale
curl http://100.79.185.4:3000/api/stats
```

---

## 🚀 Rendimiento

### Tiempo esperado de subida (por PDF):
- Análisis de nombre: ~1-2 segundos
- Obtención de metadata: ~2-3 segundos (solo primera vez)
- Búsqueda de portada: ~2-4 segundos (solo primera vez)
- Guardado: <1 segundo

**Total primera subida:** ~5-10 segundos
**Subidas adicionales (serie existente):** ~2-3 segundos

---

**¡Todo listo para probar! 🎉**

Si encuentras algún problema, revisa los logs con:
```bash
npm run status:bg
```
