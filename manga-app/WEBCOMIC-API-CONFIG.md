# 📝 Configuración de Webcomic-API

## Descripción

Este documento describe la configuración del servicio `webcomic-api` usando el contenedor Docker `soraventus12/webcomic-api:latest`.

## Archivos Creados

### 1. `.env.webcomic`
Archivo con las variables de entorno reales (con credenciales). **Este archivo está en .gitignore y NO debe compartirse.**

### 2. `.env.webcomic.example`
Archivo de ejemplo sin credenciales sensibles para referencia.

### 3. `docker-compose.yml` (actualizado)
Se ha configurado el servicio `webcomic-api` con:
- Puerto mapeado: `3001:8001` (el contenedor usa el puerto 8001 internamente)
- Variables de entorno cargadas desde `.env.webcomic`
- Volúmenes persistentes para la base de datos y logs
- Health check para monitorear el estado del servicio
- Conectado a la red `manga_network`

## Variables de Entorno Configuradas

```bash
# Base de datos
DATABASE_URL=sqlite:///./webcomics_api.db

# Seguridad
SECRET_KEY=webcomic-api-secret-key-2025-production-safe
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ENCRYPTION_KEY=dGhpcy1pcy1hLXRlc3Qta2V5LWZvci1lbmNyeXB0aW9u

# API
API_HOST=0.0.0.0
API_PORT=8001
API_DEBUG=false

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/webcomic_api.log

# Lezhin Comics
LEZHIN_BASE_URL=https://www.lezhinus.com
LEZHIN_USERNAME=aalejandro12.2000@gmail.com
LEZHIN_PASSWORD=SORA_VENTUS12

# Scraper
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30
USER_AGENT_ROTATION=true
RATE_LIMIT_PER_MINUTE=30
MAX_CONCURRENT_SCRAPERS=2

# Webhooks
WEBHOOK_TIMEOUT=30
WEBHOOK_RETRY_ATTEMPTS=3

# Monitoreo
AUTO_MONITOR_INTERVAL_MINUTES=30
MAX_CONCURRENT_CHECKS=5
ENABLE_REAL_TIME_UPDATES=true
```

## Uso

### Iniciar el servicio

```bash
cd /opt/MangaRead/manga-app
docker-compose up -d webcomic-api
```

### Ver logs

```bash
docker-compose logs -f webcomic-api
```

### Verificar estado

```bash
docker-compose ps webcomic-api
```

### Acceder a la API

La API estará disponible en:
- **URL local:** `http://localhost:3001`
- **Health check:** `http://localhost:3001/health`
- **Documentación:** `http://localhost:3001/docs`

### Reiniciar el servicio

```bash
docker-compose restart webcomic-api
```

### Detener el servicio

```bash
docker-compose stop webcomic-api
```

## Volúmenes Persistentes

- **webcomic_data**: Base de datos SQLite
- **webcomic_logs**: Archivos de log

Estos volúmenes se crean automáticamente y persisten los datos incluso si el contenedor se elimina.

## Actualizar a Nueva Versión

```bash
# Detener el servicio
docker-compose stop webcomic-api

# Descargar la última versión
docker pull soraventus12/webcomic-api:latest

# Reiniciar con la nueva imagen
docker-compose up -d webcomic-api
```

## Solución de Problemas

### Ver logs en tiempo real
```bash
docker-compose logs -f webcomic-api
```

### Verificar health check
```bash
curl http://localhost:3001/health
```

### Reiniciar si hay problemas
```bash
docker-compose restart webcomic-api
```

### Eliminar y recrear el contenedor
```bash
docker-compose down webcomic-api
docker-compose up -d webcomic-api
```

## Seguridad

⚠️ **IMPORTANTE:**
- El archivo `.env.webcomic` contiene credenciales sensibles
- Está incluido en `.gitignore` para evitar subirlo al repositorio
- Nunca compartas este archivo públicamente
- Usa `.env.webcomic.example` como referencia para otros usuarios

## Integración con Manga-App

El servicio `webcomic-api` está conectado a la misma red Docker (`manga_network`) que los demás servicios, por lo que puede comunicarse internamente con:
- `app`: Aplicación principal (puerto 3000)
- `db`: Base de datos PostgreSQL (puerto 5432)

Desde otros contenedores, puedes acceder a webcomic-api usando:
```
http://webcomic-api:8001
```
