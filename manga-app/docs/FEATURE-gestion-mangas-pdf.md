# 📁 Feature: Sistema de Gestión de Mangas PDF

## Fecha: 2026-01-18

## 📋 Descripción

Nueva funcionalidad para gestionar archivos PDF de mangas directamente desde la aplicación web, permitiendo:
- ✅ Subir nuevos mangas PDF (sin límite de tamaño)
- ✅ Agregar capítulos a series existentes
- ✅ Eliminar archivos PDF
- ✅ Búsqueda con autocomplete para seleccionar carpetas (306 carpetas disponibles)

## 🎯 Motivación

Antes de esta feature, los usuarios debían acceder al servidor vía SSH o archivos compartidos para:
- Subir nuevos mangas
- Agregar capítulos a series existentes
- Eliminar archivos

**Ahora** todo se puede hacer desde la interfaz web de manera intuitiva.

---

## 🏗️ Implementación

### Backend - API Routes

#### Nuevo archivo: [`src/routes/fileRoutes.js`](file:///home/aledev/Escritorio/opt/MangaRead/manga-app/src/routes/fileRoutes.js)

**Endpoints creados:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/files/carpetas` | Lista todas las carpetas de mangas |
| GET | `/api/files/carpetas/:nombre` | Lista PDFs de una carpeta específica |
| POST | `/api/files/subir-nuevo` | Sube PDF y crea carpeta nueva |
| POST | `/api/files/agregar-capitulo` | Agrega PDF a carpeta existente |
| DELETE | `/api/files/eliminar` | Elimina un archivo PDF |

**Características técnicas:**
- Usa `multer` para manejo de uploads
- **Sin límite de tamaño** de archivo (`limits: { fileSize: Infinity }`)
- Validación de tipo MIME (solo PDFs)
- Sanitización de nombres
- Manejo robusto de errores
- Logs de operaciones

**Código clave:**
```javascript
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  },
  limits: {
    fileSize: Infinity // Sin límite
  }
});
```

#### Modificado: [`src/server.js`](file:///home/aledev/Escritorio/opt/MangaRead/manga-app/src/server.js)

Registro de nuevas rutas:
```javascript
const fileRoutes = require('./routes/fileRoutes');
app.use(`${BASE_PATH}/api/files`, fileRoutes);
```

---

### Frontend - Interfaz de Usuario

#### Nuevo archivo: [`public/gestionar-mangas.html`](file:///home/aledev/Escritorio/opt/MangaRead/manga-app/public/gestionar-mangas.html)

**Diseño de 3 secciones:**

**1. Subir Nuevo Manga (Verde)**
- Input: Nombre del manga
- File input: Archivo PDF
- Progress bar con porcentaje y tamaño
- Botón: "Subir Nuevo Manga"

**2. Agregar Capítulo (Azul)**
- **Input con autocomplete**: Buscar carpeta de manga
  - Filtra 306 carpetas en tiempo real
  - Dropdown con sugerencias
  - Click para seleccionar
- File input: Archivo PDF del capítulo
- Progress bar
- Botón: "Agregar Capítulo"

**3. Eliminar Archivos (Rojo)**
- **Input con autocomplete**: Buscar carpeta
- Select dinámico: PDFs de la carpeta seleccionada
- Confirmación antes de eliminar
- Botón: "Eliminar Archivo"

**Características de diseño:**
- TailwindCSS con paleta consistente (primary: #4F46E5 índigo)
- Dark mode
- Material Icons
- Responsive
- Progress bars animadas
- Notificaciones toast

#### Nuevo archivo: [`public/js/gestionar-mangas.js`](file:///home/aledev/Escritorio/opt/MangaRead/manga-app/public/js/gestionar-mangas.js)

**Funciones principales:**

```javascript
cargarCarpetas()                    // Carga las 306 carpetas al iniciar
filtrarYMostrarSugerencias(query)   // Autocomplete en tiempo real
seleccionarCarpeta(tipo, nombre)    // Maneja selección del autocomplete
cargarArchivosParaEliminar(carpeta) // Carga PDFs para select de eliminación
subirNuevoManga(e)                  // Upload con progress bar (XHR)
agregarCapitulo(e)                  // Upload a carpeta existente
eliminarArchivo(e)                  // Elimina con confirmación
formatBytes(bytes)                  // Formatea tamaño de archivos
mostrarNotificacion(msg, tipo)      // Toast notifications
```

**Autocomplete:**
- Filtra carpetas mientras escribes
- Case-insensitive
- Límite de 50 sugerencias
- Scroll en dropdown
- Click fuera para cerrar

**Progress tracking:**
```javascript
xhr.upload.addEventListener('progress', (e) => {
  const percent = Math.round((e.loaded / e.total) * 100);
  progressBar.style.width = percent + '%';
  progressText.textContent = `Subiendo: ${percent}% (...)`;
});
```

#### Modificado: [`public/index.html`](file:///home/aledev/Escritorio/opt/MangaRead/manga-app/public/index.html#L158-L160)

**Cambio en navegación:**
```html
<!-- ANTES -->
<button title="Calificar pendientes">
  <span class="material-symbols-outlined">grade</span>
</button>

<!-- DESPUÉS -->
<button onclick="window.location.href='gestionar-mangas.html'" 
        title="Gestionar Mangas PDF">
  <span class="material-symbols-outlined">upload_file</span>
</button>
```

**Impacto:**
- ⚠️ `calificar.html` temporalmente deshabilitado
- ✅ Nuevo botón en header apunta a gestión de PDFs

---

### Configuración - Docker

#### Modificado: [`docker-compose.yml`](file:///home/aledev/Escritorio/opt/MangaRead/manga-app/docker-compose.yml#L50)

**Cambio crítico:**
```yaml
# ANTES
- /opt/MangaRead/Mangas:/opt/MangaRead/Mangas:ro

# DESPUÉS
- /opt/MangaRead/Mangas:/opt/MangaRead/Mangas:rw
```

**Justificación:**
El volumen debe tener permisos de **lectura/escritura** para:
- Crear carpetas nuevas
- Subir archivos PDF
- Eliminar archivos

---

## 🧪 Pruebas Realizadas

### API Endpoints

**1. Listar carpetas:**
```bash
curl http://localhost:3000/upload/api/files/carpetas
# ✅ Resultado: {"total":304,"carpetas":[...]}
```

**2. Contenedores Docker:**
```bash
docker-compose ps
# ✅ manga_app: Up
# ✅ manga_db: Up (healthy)
# ✅ webcomic-inme: Up
```

**3. Servidor:**
```
✅ Servidor ejecutándose en http://localhost:3000/upload
✅ Ruta base configurada: /upload
```

### Verificación Manual Recomendada

**Test 1: Subir nuevo manga**
1. Ir a `http://localhost:3000/upload/gestionar-mangas.html`
2. Sección 1: "Subir Nuevo Manga"
3. Nombre: "Test Manga"
4. Seleccionar un PDF
5. Click "Subir Nuevo Manga"
6. **Verificar**: Carpeta creada en `/opt/MangaRead/Mangas/Test Manga/`
7. **Verificar**: Progress bar funciona

**Test 2: Agregar capítulo con autocomplete**
1. Sección 2: "Agregar Capítulo"
2. Escribir en el campo de búsqueda (ej: "One")
3. **Verificar**: Aparecen sugerencias filtradas
4. Click en una sugerencia
5. Seleccionar PDF
6. Click "Agregar Capítulo"
7. **Verificar**: Archivo agregado a la carpeta

**Test 3: Eliminar con autocomplete**
1. Sección 3: "Eliminar Archivos"
2. Buscar carpeta con autocomplete
3. **Verificar**: Select de archivos se llena dinámicamente
4. Seleccionar archivo
5. Click "Eliminar Archivo"
6. **Verificar**: Confirmación aparece
7. **Confirmar**: Archivo eliminado

---

## 📁 Archivos Creados/Modificados

### Creados (5)
1. `src/routes/fileRoutes.js` - Backend API (219 líneas)
2. `public/gestionar-mangas.html` - Interfaz (243 líneas)
3. `public/js/gestionar-mangas.js` - Lógica frontend (349 líneas)
4. `docs/FEATURE-gestion-mangas-pdf.md` - Esta documentación
5. `.../task.md` - Checklist de implementación

### Modificados (3)
1. `src/server.js` - Registro de fileRoutes (+2 líneas)
2. `docker-compose.yml` - Volumen rw (+1 comentario, :ro → :rw)
3. `public/index.html` - Icono navegación (grade → upload_file)

---

## 🔒 Seguridad

**Validaciones implementadas:**
- ✅ Solo archivos PDF permitidos (MIME type check)
- ✅ Sanitización de nombres de carpetas/archivos
- ✅ Verificación de existencia antes de eliminar
- ✅ Confirmación de usuario antes de eliminación
- ✅ Rutas relativas (previene path traversal)

**Límites:**
- ✅ Sin límite de tamaño (soporte para mangas >1GB)
- ✅ Solo PDFs (no ejecutables, scripts, etc.)

---

## 🚀 Mejoras Futuras (Opcional)

1. **Vista previa de PDFs** antes de subir
2. **Renombrar archivos/carpetas** desde la interfaz
3. **Estadísticas** de almacenamiento por carpeta
4. **Mover archivos** entre carpetas
5. **Backup automático** antes de eliminar
6. **Compress/optimize PDFs** al subir

---

## 📊 Impacto

**Antes:**
- Gestión manual por SSH/SFTP/SMB
- Sin interfaz para eliminar
- Propenso a errores

**Después:**
- ✅ Todo desde interfaz web
- ✅ Autocomplete para 306 carpetas
- ✅ Progress tracking
- ✅ Confirmaciones de seguridad
- ✅ Notificaciones de estado

---

## 🔗 Enlaces Relacionados

- Feature request: Gestión de archivos PDF
- Plan de implementación: [implementation_plan.md](file:///home/aledev/.gemini/antigravity/brain/ebd30192-8461-4ced-983b-038bb6d781cc/implementation_plan.md)
- Walkthrough actualizado: [walkthrough.md](file:///home/aledev/.gemini/antigravity/brain/ebd30192-8461-4ced-983b-038bb6d781cc/walkthrough.md)
