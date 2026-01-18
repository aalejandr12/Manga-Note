# 📚 App de Gestión de Mangas

Aplicación web completa para organizar y gestionar tu colección de mangas, construida con Node.js, Express, PostgreSQL y Docker.

## ✨ Características

- ✅ **CRUD completo de mangas**: Crear, leer, actualizar y eliminar mangas
- 📖 **Gestión de lectura**: Seguimiento de capítulos y estado de lectura
- ⭐ **Sistema de calificación**: Califica tus mangas del 1 al 5
- 🖼️ **Subida de portadas**: Almacenamiento de imágenes de portada
- 🔗 **Enlaces de lectura**: Múltiples enlaces por manga (MangaPlus, VIZ, etc.)
- 💬 **Opiniones personales**: Agrega comentarios sobre cada manga
- 🎨 **Diseño responsivo**: Interfaz moderna con modo oscuro
- 🐳 **Docker**: Despliegue fácil con contenedores
- 💾 **Persistencia de datos**: Base de datos PostgreSQL con volúmenes

## 🛠️ Tecnologías

- **Backend**: Node.js + Express
- **Base de datos**: PostgreSQL
- **ORM**: Prisma
- **Frontend**: HTML5, CSS (Tailwind), JavaScript vanilla
- **Contenedores**: Docker + Docker Compose

## 📋 Requisitos Previos

- [Docker](https://www.docker.com/get-started) instalado
- [Docker Compose](https://docs.docker.com/compose/install/) instalado
- Puerto 3000 y 5432 disponibles

## 🚀 Instalación y Ejecución

### 1. Clonar o descargar el proyecto

```bash
cd manga-app
```

### 2. Configurar variables de entorno (opcional)

El proyecto incluye un archivo `.env` con configuración por defecto. Si deseas personalizarlo:

```bash
cp .env.example .env
# Edita .env con tus valores personalizados
```

### 3. Levantar el proyecto con Docker

```bash
docker-compose up --build
```

Este comando:
- ✅ Construye la imagen de la aplicación
- ✅ Inicia PostgreSQL con persistencia
- ✅ Ejecuta las migraciones de la base de datos
- ✅ Inicia el servidor Express

### 4. Acceder a la aplicación

Abre tu navegador y visita:

```
http://localhost:3000
```

## 📁 Estructura del Proyecto

```
manga-app/
├── data/
│   └── covers/              # Portadas de mangas (persistente)
├── prisma/
│   └── schema.prisma        # Esquema de base de datos
├── public/                  # Frontend estático
│   ├── index.html           # Lista de mangas
│   ├── detalle.html         # Detalle de manga
│   ├── agregar.html         # Formulario agregar/editar
│   └── js/
│       ├── index.js         # Lógica lista de mangas
│       ├── detalle.js       # Lógica detalle
│       └── agregar.js       # Lógica formulario
├── src/
│   ├── server.js            # Servidor Express
│   └── routes/
│       ├── mangaRoutes.js   # Endpoints de mangas
│       └── linkRoutes.js    # Endpoints de links
├── .env                     # Variables de entorno
├── docker-compose.yml       # Configuración Docker Compose
├── Dockerfile               # Imagen de la aplicación
├── package.json             # Dependencias Node.js
└── README.md               # Este archivo
```

## 🔌 API REST

### Mangas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/mangas` | Listar todos los mangas |
| GET | `/api/mangas/:id` | Obtener detalle de un manga |
| POST | `/api/mangas` | Crear un nuevo manga |
| PUT | `/api/mangas/:id` | Actualizar un manga |
| DELETE | `/api/mangas/:id` | Eliminar un manga |
| POST | `/api/mangas/:id/portada` | Subir/actualizar portada |
| POST | `/api/mangas/:id/links` | Agregar link a un manga |

### Links

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| PUT | `/api/links/:id` | Actualizar un link |
| DELETE | `/api/links/:id` | Eliminar un link |

### Ejemplos de uso

#### Crear un manga

```bash
curl -X POST http://localhost:3000/api/mangas \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "One Piece",
    "tipo": "manga",
    "estadoLectura": "leyendo",
    "capituloActual": 1044,
    "calificacion": 5,
    "comentarioOpinion": "El mejor manga de aventuras"
  }'
```

#### Subir portada

```bash
curl -X POST http://localhost:3000/api/mangas/1/portada \
  -F "portada=@/ruta/a/portada.jpg"
```

#### Agregar link de lectura

```bash
curl -X POST http://localhost:3000/api/mangas/1/links \
  -H "Content-Type: application/json" \
  -d '{
    "nombreFuente": "MangaPlus",
    "url": "https://mangaplus.shueisha.co.jp/titles/100020",
    "esPrincipal": true
  }'
```

## 🗄️ Base de Datos

### Modelo de datos

#### Tabla: mangas

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | Int | ID autoincremental |
| titulo | String | Título del manga (requerido) |
| tipo | String | Tipo: manga, manhwa, manhua, etc. |
| estadoLectura | String | no_empezado, leyendo, terminado, en_pausa |
| capituloActual | Int | Capítulo actual de lectura |
| calificacion | Int | Calificación 1-5 |
| comentarioOpinion | Text | Comentario personal |
| portadaUrl | String | Ruta de la portada |
| fechaCreacion | DateTime | Fecha de creación |
| fechaActualizacion | DateTime | Fecha de última actualización |

#### Tabla: links

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | Int | ID autoincremental |
| mangaId | Int | FK a mangas |
| nombreFuente | String | Nombre del sitio/app |
| url | String | URL del enlace |
| esPrincipal | Boolean | Marca si es el link principal |

### Migraciones

Las migraciones se ejecutan automáticamente al iniciar el contenedor. Para crear nuevas migraciones:

```bash
# Entrar al contenedor
docker exec -it manga_app sh

# Crear migración
npx prisma migrate dev --name nombre_migracion
```

## 🛑 Detener la Aplicación

```bash
docker-compose down
```

Para detener y **eliminar los volúmenes** (⚠️ esto borra los datos):

```bash
docker-compose down -v
```

## 🔧 Desarrollo

### Modo desarrollo con hot-reload

Para desarrollo local, descomenta las líneas de volúmenes en `docker-compose.yml`:

```yaml
volumes:
  - ./data/covers:/usr/src/app/data/covers
  - ./src:/usr/src/app/src          # Descomentar
  - ./public:/usr/src/app/public    # Descomentar
```

Y usa nodemon:

```bash
docker-compose up
```

### Acceder a Prisma Studio

Prisma Studio es una GUI para explorar la base de datos:

```bash
docker exec -it manga_app npx prisma studio
```

Accede en: `http://localhost:5555`

## 📦 Respaldo de Datos

### Respaldar la base de datos

```bash
docker exec manga_db pg_dump -U manga_user manga_db > backup.sql
```

### Restaurar la base de datos

```bash
docker exec -i manga_db psql -U manga_user manga_db < backup.sql
```

### Respaldar portadas

Las portadas están en `./data/covers/`. Simplemente copia esta carpeta:

```bash
cp -r data/covers backup_covers/
```

## 🎨 Personalización

### Cambiar colores del tema

Edita los archivos HTML en `public/` y modifica la configuración de Tailwind:

```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: "#TU_COLOR", // Cambia aquí
      }
    }
  }
}
```

### Agregar nuevos campos

1. Modifica `prisma/schema.prisma`
2. Crea la migración: `npx prisma migrate dev`
3. Actualiza las rutas en `src/routes/`
4. Actualiza el frontend en `public/`

## 🐛 Troubleshooting

### El contenedor no inicia

```bash
# Ver logs
docker-compose logs app
docker-compose logs db

# Reiniciar contenedores
docker-compose restart
```

### Error de conexión a la base de datos

Verifica que el contenedor de PostgreSQL esté saludable:

```bash
docker-compose ps
```

### Puerto 3000 o 5432 en uso

Cambia los puertos en `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Puerto externo:interno
```

### Problemas con migraciones

```bash
# Reset completo de la base de datos (⚠️ borra datos)
docker exec -it manga_app npx prisma migrate reset
```

## 📝 Notas Importantes

- ✅ Los datos de PostgreSQL se guardan en un volumen nombrado `db_data`
- ✅ Las portadas se guardan en `./data/covers/` (bind mount)
- ✅ Los datos **NO se pierden** al reiniciar los contenedores
- ✅ Los datos **SÍ se mueven** si copias la carpeta del proyecto (incluye `data/covers/`)
- ⚠️ Solo usa `docker-compose down -v` si quieres **eliminar todos los datos**

## 📄 Licencia

MIT

## 👤 Autor

Proyecto creado como app de gestión personal de mangas.

---

¡Disfruta organizando tu colección de mangas! 📚✨
