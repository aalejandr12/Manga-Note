# 📖 Documentación de API

## Base URL

```
http://localhost:3000/api
```

---

## 📚 Mangas

### Listar todos los mangas

```http
GET /api/mangas
```

**Respuesta exitosa (200)**

```json
[
  {
    "id": 1,
    "titulo": "One Piece",
    "tipo": "manga",
    "estadoLectura": "leyendo",
    "capituloActual": 1044,
    "calificacion": 5,
    "comentarioOpinion": "El mejor manga de aventuras",
    "portadaUrl": "cover-1234567890.jpg",
    "fechaCreacion": "2023-12-01T10:00:00.000Z",
    "fechaActualizacion": "2023-12-01T10:00:00.000Z",
    "links": [
      {
        "id": 1,
        "mangaId": 1,
        "nombreFuente": "MangaPlus",
        "url": "https://mangaplus.shueisha.co.jp/titles/100020",
        "esPrincipal": true
      }
    ],
    "_count": {
      "links": 1
    }
  }
]
```

---

### Obtener un manga por ID

```http
GET /api/mangas/:id
```

**Parámetros de URL**
- `id` (integer): ID del manga

**Ejemplo**

```bash
curl http://localhost:3000/api/mangas/1
```

**Respuesta exitosa (200)**

```json
{
  "id": 1,
  "titulo": "One Piece",
  "tipo": "manga",
  "estadoLectura": "leyendo",
  "capituloActual": 1044,
  "calificacion": 5,
  "comentarioOpinion": "El mejor manga de aventuras",
  "portadaUrl": "cover-1234567890.jpg",
  "fechaCreacion": "2023-12-01T10:00:00.000Z",
  "fechaActualizacion": "2023-12-01T10:00:00.000Z",
  "links": [...]
}
```

**Respuesta de error (404)**

```json
{
  "error": "Manga no encontrado"
}
```

---

### Crear un manga

```http
POST /api/mangas
```

**Cuerpo de la petición (JSON)**

```json
{
  "titulo": "Jujutsu Kaisen",
  "tipo": "manga",
  "estadoLectura": "leyendo",
  "capituloActual": 258,
  "calificacion": 5,
  "comentarioOpinion": "Increíble sistema de poder"
}
```

**Campos**
- `titulo` (string, **requerido**): Título del manga
- `tipo` (string, opcional): Tipo de manga (manga, manhwa, manhua, webtoon, comic)
- `estadoLectura` (string, opcional): Estado de lectura
  - Valores: `no_empezado`, `leyendo`, `terminado`, `en_pausa`
  - Default: `no_empezado`
- `capituloActual` (integer, opcional): Capítulo actual de lectura
- `calificacion` (integer, opcional): Calificación de 1 a 5
- `comentarioOpinion` (string, opcional): Comentario personal

**Ejemplo con curl**

```bash
curl -X POST http://localhost:3000/api/mangas \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Jujutsu Kaisen",
    "tipo": "manga",
    "estadoLectura": "leyendo",
    "capituloActual": 258,
    "calificacion": 5,
    "comentarioOpinion": "Increíble sistema de poder"
  }'
```

**Respuesta exitosa (201)**

```json
{
  "id": 2,
  "titulo": "Jujutsu Kaisen",
  "tipo": "manga",
  "estadoLectura": "leyendo",
  "capituloActual": 258,
  "calificacion": 5,
  "comentarioOpinion": "Increíble sistema de poder",
  "portadaUrl": null,
  "fechaCreacion": "2023-12-01T10:00:00.000Z",
  "fechaActualizacion": "2023-12-01T10:00:00.000Z"
}
```

**Respuesta de error (400)**

```json
{
  "error": "El título es requerido"
}
```

---

### Actualizar un manga

```http
PUT /api/mangas/:id
```

**Parámetros de URL**
- `id` (integer): ID del manga

**Cuerpo de la petición (JSON)**

```json
{
  "titulo": "Jujutsu Kaisen",
  "estadoLectura": "terminado",
  "capituloActual": 271,
  "calificacion": 4,
  "comentarioOpinion": "Final apresurado pero buen manga"
}
```

**Ejemplo con curl**

```bash
curl -X PUT http://localhost:3000/api/mangas/2 \
  -H "Content-Type: application/json" \
  -d '{
    "estadoLectura": "terminado",
    "capituloActual": 271
  }'
```

**Respuesta exitosa (200)**

```json
{
  "id": 2,
  "titulo": "Jujutsu Kaisen",
  "tipo": "manga",
  "estadoLectura": "terminado",
  "capituloActual": 271,
  "calificacion": 4,
  "comentarioOpinion": "Final apresurado pero buen manga",
  "portadaUrl": null,
  "fechaCreacion": "2023-12-01T10:00:00.000Z",
  "fechaActualizacion": "2023-12-01T11:30:00.000Z",
  "links": [...]
}
```

---

### Eliminar un manga

```http
DELETE /api/mangas/:id
```

**Parámetros de URL**
- `id` (integer): ID del manga

**Ejemplo con curl**

```bash
curl -X DELETE http://localhost:3000/api/mangas/2
```

**Respuesta exitosa (200)**

```json
{
  "message": "Manga eliminado correctamente"
}
```

**Nota:** Al eliminar un manga, también se eliminan:
- Todos los links asociados (cascada)
- La portada del manga (si existe)

---

### Subir/actualizar portada

```http
POST /api/mangas/:id/portada
```

**Parámetros de URL**
- `id` (integer): ID del manga

**Cuerpo de la petición (multipart/form-data)**
- `portada` (file): Archivo de imagen (PNG, JPG, WEBP, max 5MB)

**Ejemplo con curl**

```bash
curl -X POST http://localhost:3000/api/mangas/1/portada \
  -F "portada=@/ruta/a/portada.jpg"
```

**Respuesta exitosa (200)**

```json
{
  "message": "Portada actualizada correctamente",
  "portadaUrl": "/covers/cover-1701432000000-123456789.jpg",
  "manga": {
    "id": 1,
    "titulo": "One Piece",
    ...
    "portadaUrl": "cover-1701432000000-123456789.jpg"
  }
}
```

**Respuesta de error (400)**

```json
{
  "error": "No se recibió ningún archivo"
}
```

---

### Agregar link de lectura a un manga

```http
POST /api/mangas/:id/links
```

**Parámetros de URL**
- `id` (integer): ID del manga

**Cuerpo de la petición (JSON)**

```json
{
  "nombreFuente": "MangaPlus",
  "url": "https://mangaplus.shueisha.co.jp/titles/100020",
  "esPrincipal": true
}
```

**Campos**
- `nombreFuente` (string, **requerido**): Nombre de la fuente/sitio
- `url` (string, **requerido**): URL del enlace
- `esPrincipal` (boolean, opcional): Marca si es el link principal (default: false)

**Ejemplo con curl**

```bash
curl -X POST http://localhost:3000/api/mangas/1/links \
  -H "Content-Type: application/json" \
  -d '{
    "nombreFuente": "VIZ",
    "url": "https://www.viz.com/shonenjump/chapters/one-piece",
    "esPrincipal": false
  }'
```

**Respuesta exitosa (201)**

```json
{
  "id": 2,
  "mangaId": 1,
  "nombreFuente": "VIZ",
  "url": "https://www.viz.com/shonenjump/chapters/one-piece",
  "esPrincipal": false
}
```

---

## 🔗 Links

### Actualizar un link

```http
PUT /api/links/:id
```

**Parámetros de URL**
- `id` (integer): ID del link

**Cuerpo de la petición (JSON)**

```json
{
  "nombreFuente": "MangaPlus Official",
  "url": "https://mangaplus.shueisha.co.jp/titles/100020",
  "esPrincipal": true
}
```

**Ejemplo con curl**

```bash
curl -X PUT http://localhost:3000/api/links/1 \
  -H "Content-Type: application/json" \
  -d '{
    "nombreFuente": "MangaPlus Official"
  }'
```

**Respuesta exitosa (200)**

```json
{
  "id": 1,
  "mangaId": 1,
  "nombreFuente": "MangaPlus Official",
  "url": "https://mangaplus.shueisha.co.jp/titles/100020",
  "esPrincipal": true
}
```

---

### Eliminar un link

```http
DELETE /api/links/:id
```

**Parámetros de URL**
- `id` (integer): ID del link

**Ejemplo con curl**

```bash
curl -X DELETE http://localhost:3000/api/links/2
```

**Respuesta exitosa (200)**

```json
{
  "message": "Link eliminado correctamente"
}
```

---

## 🖼️ Portadas

Las portadas se sirven como archivos estáticos:

```
GET /covers/:filename
```

**Ejemplo**

```
http://localhost:3000/covers/cover-1701432000000-123456789.jpg
```

---

## ⚠️ Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | Operación exitosa |
| 201 | Recurso creado exitosamente |
| 400 | Error en la petición (validación) |
| 404 | Recurso no encontrado |
| 500 | Error interno del servidor |

---

## 📝 Notas

- Todos los campos de fecha están en formato ISO 8601
- Los campos opcionales pueden ser `null`
- El campo `estadoLectura` acepta solo estos valores:
  - `no_empezado`
  - `leyendo`
  - `terminado`
  - `en_pausa`
- Las portadas se almacenan en `/data/covers/` con nombres únicos
- Al eliminar un manga, se eliminan automáticamente sus links (cascada)
- La calificación debe ser un número entero entre 1 y 5
