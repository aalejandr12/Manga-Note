# Resumen de Actualizaciones - My Mangas App

## Cambios Realizados

### 1. ✅ Corrección de Portadas
- **Problema**: Las portadas no cargaban correctamente
- **Solución**: 
  - Actualizado todas las rutas de portadas para usar `BASE_PATH` dinámico
  - Modificados archivos: `index.js`, `detalle.js`, `agregar.js`
  - Las portadas ahora funcionan tanto en `/` como en `/MyLibreria/`

### 2. ✅ Filtros por Estado de Lectura
- **Nueva funcionalidad**: Sistema de filtros interactivo
- **Características**:
  - Botón de filtros en el header (icono tune)
  - 5 opciones de filtro:
    - Todos
    - Leyendo
    - Terminado
    - En Pausa
    - No Empezado
  - Interfaz responsive con scroll horizontal
  - Botones con colores distintivos (activo en azul primario)
  
### 3. ✅ Soporte para Subpath (/MyLibreria/)
- **Configuración para servir en**: `komga.aaleddy.app/MyLibreria/`
- **Cambios realizados**:
  - Agregada variable `BASE_PATH` en todas las rutas
  - Actualizado `server.js` para manejar subpaths
  - Configurado docker-compose.yml con variable de entorno
  - Todas las redirecciones y enlaces ahora son dinámicos
  
### 4. ✅ Migración desde Komga
- **Estado**: 621 mangas importados (311 originales + 310 de Komga)
- **Limitaciones conocidas**: Algunas portadas no se copiaron debido a diferencias en nombres de carpetas

## Archivos Modificados

### Frontend (public/)
```
public/index.html              - Agregado UI de filtros
public/js/index.js             - Filtros + BASE_PATH
public/js/detalle.js           - BASE_PATH en todas las rutas
public/js/agregar.js           - BASE_PATH en todas las rutas
```

### Backend (src/)
```
src/server.js                  - Soporte para BASE_PATH con Express
```

### Configuración
```
.env                           - Agregada variable BASE_PATH=/MyLibreria
docker-compose.yml             - Agregada env var BASE_PATH
```

### Documentación
```
CONFIGURACION_NGINX.md         - Guía completa de configuración de proxy
RESUMEN_CAMBIOS.md            - Este archivo
```

## Estado Actual del Proyecto

### ✅ Funcionando
- [x] CRUD completo de mangas
- [x] Sistema de calificación (1-5 estrellas)
- [x] Estados de lectura (4 opciones)
- [x] Enlaces de lectura múltiples
- [x] Subida de portadas
- [x] Filtros por estado
- [x] Soporte para subpath
- [x] Migración desde Komga
- [x] Base de datos PostgreSQL persistente

### ⚠️ Limitaciones Conocidas
- Algunas portadas de Komga no se importaron (nombres de carpetas con caracteres especiales)
- Los mangas importados tienen comentarios genéricos ("Importado desde Komga")

### 📋 Próximos Pasos Sugeridos
1. Configurar NGINX como proxy inverso (ver CONFIGURACION_NGINX.md)
2. Opcionalmente: Agregar portadas manualmente a los mangas sin portada
3. Opcionalmente: Actualizar comentarios y calificaciones de mangas importados

## URLs de Acceso

### Local (Docker)
```
http://localhost:3000/MyLibreria/
```

### Con NGINX configurado
```
https://komga.aaleddy.app/MyLibreria/
```

## Comandos Útiles

### Gestión de Contenedores
```bash
# Ver estado
sudo docker ps

# Ver logs
sudo docker logs -f manga_app

# Reiniciar
cd /opt/MangaRead/manga-app
sudo docker-compose restart

# Reconstruir
sudo docker-compose down
sudo docker-compose up --build -d
```

### Verificar funcionamiento
```bash
# Test local
curl -I http://localhost:3000/MyLibreria/

# Test API
curl http://localhost:3000/MyLibreria/api/mangas | jq '.[0:3]'
```

## Características de los Filtros

### Interfaz
- **Ubicación**: Header debajo del título "My Mangas"
- **Toggle**: Click en icono de filtros (tune) para mostrar/ocultar
- **Diseño**: Botones en fila con scroll horizontal
- **Estado visual**: Botón activo en azul, inactivos en gris

### Funcionalidad
- **"Todos"**: Muestra los 621 mangas completos
- **"Leyendo"**: Solo mangas con estado "leyendo"
- **"Terminado"**: Solo mangas con estado "terminado"
- **"En Pausa"**: Solo mangas con estado "en_pausa"
- **"No Empezado"**: Solo mangas con estado "no_empezado"

### Implementación Técnica
```javascript
// Variables globales en index.js
let todosLosMangas = [];      // Cache de todos los mangas
let estadoActual = 'todos';   // Estado del filtro actual

// Función de filtrado
function filtrarPorEstado(estado) {
  // Actualiza estadoActual
  // Filtra todosLosMangas según estado
  // Re-renderiza el grid
}
```

## Configuración BASE_PATH

### ¿Cómo funciona?
El sistema detecta automáticamente si está corriendo en un subpath:

```javascript
// En cada archivo JS
const BASE_PATH = window.location.pathname.includes('/MyLibreria') 
  ? '/MyLibreria' 
  : '';
```

### Cambiar el subpath
Para cambiar de `/MyLibreria/` a otro path:

1. Edita `.env`:
```env
BASE_PATH=/OtroPath
```

2. Reinicia contenedores:
```bash
sudo docker-compose down
sudo docker-compose up -d
```

3. Actualiza NGINX (si aplica):
```nginx
location /OtroPath/ {
    proxy_pass http://localhost:3000/OtroPath/;
    ...
}
```

## Datos Importados de Komga

### Estadísticas
- **Total importado**: 310 series
- **Estados mapeados**:
  - Terminado: Series con READ_COUNT = BOOK_COUNT
  - Leyendo: Series con READ_COUNT > 0 o IN_PROGRESS_COUNT > 0
  - No Empezado: Series sin progreso de lectura

### Campos Importados
```javascript
{
  titulo: "Nombre de la Serie",
  tipo: "Manga",
  estadoLectura: "terminado|leyendo|no_empezado",
  capituloActual: <número>,
  calificacion: null,
  comentarioOpinion: "Importado desde Komga - X volúmenes totales",
  portadaUrl: "cover-123456.jpg" // si se encontró la imagen
}
```

## Soporte y Mantenimiento

### Logs Importantes
```bash
# Aplicación
sudo docker logs manga_app --tail 100 -f

# Base de datos
sudo docker logs manga_db --tail 50

# NGINX (después de configurar)
sudo tail -f /var/log/nginx/komga.aaleddy.app.error.log
```

### Backup de Base de Datos
```bash
# Exportar
sudo docker exec manga_db pg_dump -U manga_user manga_db > backup.sql

# Importar
cat backup.sql | sudo docker exec -i manga_db psql -U manga_user manga_db
```

### Backup de Portadas
```bash
# Las portadas están en:
/opt/MangaRead/manga-app/data/covers/

# Backup
tar -czf covers-backup-$(date +%Y%m%d).tar.gz /opt/MangaRead/manga-app/data/covers/
```

## Testing

### Test de Filtros
1. Abre `http://localhost:3000/MyLibreria/`
2. Click en icono de filtros (tune)
3. Selecciona "Leyendo" - verifica que solo aparecen mangas en lectura
4. Selecciona "Terminado" - verifica cambio de contenido
5. Selecciona "Todos" - verifica que muestra los 621 mangas

### Test de Subpath
```bash
# Debe devolver 200 OK
curl -I http://localhost:3000/MyLibreria/

# Debe devolver JSON con mangas
curl http://localhost:3000/MyLibreria/api/mangas

# Las portadas deben servirse
curl -I http://localhost:3000/MyLibreria/covers/<nombre-archivo>
```

### Test de Portadas
1. Abre un manga en detalle
2. Verifica que la portada se muestra correctamente
3. Click en "Editar"
4. Verifica que la portada se muestra en el formulario

## Estructura de Datos

### Manga Model
```prisma
model Manga {
  id                Int      @id @default(autoincrement())
  titulo            String
  tipo              String?
  estadoLectura     String   @default("no_empezado")
  capituloActual    Int?
  calificacion      Int?
  comentarioOpinion String?
  portadaUrl        String?
  links             Link[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### Link Model
```prisma
model Link {
  id            Int     @id @default(autoincrement())
  mangaId       Int
  nombreFuente  String
  url           String
  esPrincipal   Boolean @default(false)
  manga         Manga   @relation(fields: [mangaId], references: [id], onDelete: Cascade)
}
```

## Contacto y Soporte

Para reportar problemas o sugerencias:
1. Revisa primero los logs del contenedor
2. Verifica la configuración de NGINX
3. Revisa este documento para troubleshooting

---

**Última actualización**: 24 de Noviembre, 2025
**Versión**: 1.1.0
**Estado**: Producción Ready ✅
