# 📂 Estructura del Proyecto

```
manga-app/
│
├── 📁 data/                      # Datos persistentes
│   └── 📁 covers/                # Portadas de mangas (volumen Docker)
│       └── .gitkeep
│
├── 📁 docs/                      # Documentación
│   └── API.md                    # Documentación de la API REST
│
├── 📁 prisma/                    # Prisma ORM
│   ├── schema.prisma             # Modelos de base de datos
│   └── 📁 migrations/            # Migraciones (generadas)
│       ├── migration_lock.toml
│       └── 📁 20231201000000_init/
│           └── migration.sql
│
├── 📁 public/                    # Frontend estático
│   ├── index.html                # 🏠 Pantalla principal (lista)
│   ├── detalle.html              # 📖 Pantalla de detalle
│   ├── agregar.html              # ➕ Formulario agregar/editar
│   └── 📁 js/                    # JavaScript del frontend
│       ├── index.js              # Lógica lista de mangas
│       ├── detalle.js            # Lógica detalle
│       └── agregar.js            # Lógica formulario
│
├── 📁 scripts/                   # Scripts auxiliares
│   └── seed.js                   # 🌱 Script para poblar BD con datos
│
├── 📁 src/                       # Backend Node.js
│   ├── server.js                 # 🚀 Servidor Express principal
│   └── 📁 routes/                # Rutas de la API
│       ├── mangaRoutes.js        # Endpoints de mangas
│       └── linkRoutes.js         # Endpoints de links
│
├── .dockerignore                 # Archivos ignorados por Docker
├── .env                          # ⚙️  Variables de entorno (local)
├── .env.example                  # Ejemplo de variables de entorno
├── .gitignore                    # Archivos ignorados por Git
├── .npmignore                    # Archivos ignorados por npm
├── docker-compose.yml            # 🐳 Configuración Docker Compose
├── Dockerfile                    # 🐳 Imagen de la aplicación
├── package.json                  # 📦 Dependencias Node.js
├── QUICKSTART.md                 # ⚡ Guía de inicio rápido
├── README.md                     # 📘 Documentación principal
└── start.sh                      # 🎬 Script de inicio rápido
```

---

## 🔑 Archivos Clave

### Backend

| Archivo | Descripción |
|---------|-------------|
| `src/server.js` | Punto de entrada del servidor Express |
| `src/routes/mangaRoutes.js` | API REST para mangas (CRUD + portadas) |
| `src/routes/linkRoutes.js` | API REST para links de lectura |
| `prisma/schema.prisma` | Definición de modelos de base de datos |

### Frontend

| Archivo | Descripción |
|---------|-------------|
| `public/index.html` | Pantalla principal con grid de mangas |
| `public/detalle.html` | Vista detallada de un manga |
| `public/agregar.html` | Formulario para crear/editar mangas |
| `public/js/index.js` | Consumo de API para la lista |
| `public/js/detalle.js` | Consumo de API para el detalle |
| `public/js/agregar.js` | Consumo de API para el formulario |

### Docker

| Archivo | Descripción |
|---------|-------------|
| `Dockerfile` | Imagen de la aplicación Node.js |
| `docker-compose.yml` | Orquestación de app + PostgreSQL |

### Configuración

| Archivo | Descripción |
|---------|-------------|
| `.env` | Variables de entorno (no versionar) |
| `package.json` | Dependencias y scripts npm |

---

## 🗄️ Volúmenes Docker

| Volumen | Tipo | Descripción |
|---------|------|-------------|
| `db_data` | Named volume | Datos de PostgreSQL (persistente) |
| `./data/covers` | Bind mount | Portadas de mangas (persistente) |

---

## 🌐 Puertos

| Puerto | Servicio | Descripción |
|--------|----------|-------------|
| 3000 | App | Servidor Express (backend + frontend) |
| 5432 | PostgreSQL | Base de datos (solo interno) |

---

## 📊 Base de Datos

### Tablas

| Tabla | Descripción | Relaciones |
|-------|-------------|------------|
| `mangas` | Información de mangas | 1:N con `links` |
| `links` | Enlaces de lectura | N:1 con `mangas` |

### Campos principales

**mangas**
- `id`, `titulo`, `tipo`, `estadoLectura`, `capituloActual`
- `calificacion`, `comentarioOpinion`, `portadaUrl`
- `fechaCreacion`, `fechaActualizacion`

**links**
- `id`, `mangaId` (FK), `nombreFuente`, `url`, `esPrincipal`

---

## 🔄 Flujo de Datos

```
Usuario → Frontend (HTML/JS) → API REST → Express → Prisma → PostgreSQL
                                    ↓
                              Archivos estáticos
                              (portadas en /covers)
```

---

## 🚀 Comandos Principales

```bash
# Iniciar
docker-compose up --build

# Detener
docker-compose down

# Ver logs
docker-compose logs -f

# Poblar BD con datos de ejemplo
docker exec -it manga_app npm run seed

# Acceder a Prisma Studio
docker exec -it manga_app npx prisma studio
```

---

## 📝 Scripts npm

| Script | Comando | Descripción |
|--------|---------|-------------|
| `start` | `node src/server.js` | Iniciar en producción |
| `dev` | `nodemon src/server.js` | Desarrollo con hot-reload |
| `seed` | `node scripts/seed.js` | Poblar BD con datos |
| `prisma:generate` | `prisma generate` | Generar cliente Prisma |
| `prisma:migrate` | `prisma migrate deploy` | Ejecutar migraciones |
| `prisma:studio` | `prisma studio` | Abrir Prisma Studio |

---

Para más detalles, consulta:
- [README.md](../README.md) - Documentación completa
- [QUICKSTART.md](../QUICKSTART.md) - Inicio rápido
- [docs/API.md](API.md) - Documentación de API
