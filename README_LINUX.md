# Manga Library - Instrucciones para Linux

Este proyecto fue originalmente optimizado para Termux (Android). Aquí hay pasos concretos para instalar y ejecutar en un sistema Linux moderno (Debian/Ubuntu como referencia).

## Requisitos mínimos

- Node.js 18+ y npm
- build-essential (compiladores)
- Librería para `sharp` (libvips)

En Debian/Ubuntu:

```bash
sudo apt update
sudo apt install -y nodejs npm build-essential libvips-dev
```

En otras distribuciones usa el gestor de paquetes correspondiente.

## Instalación del proyecto

1. Clona o sitúate en la carpeta del proyecto:

```bash
cd /ruta/a/MangaRead
```

2. Instala dependencias de Node:

```bash
npm install
```

Si falla la instalación de `sharp`, instala `libvips-dev` (ver arriba).

## Arrancar la aplicación

- Modo interactivo / desarrollo:

```bash
npm run dev
```

- Modo producción (background simple):

```bash
./start.sh
```

- Usando el script optimizado (usa variables de entorno y detecta el directorio):

```bash
./start-optimized.sh
```

## Arrancar como servicio de usuario (systemd)

Se incluye un ejemplo de unidad systemd en `systemd/manga-library.service`. Para usarlo como servicio del usuario:

```bash
# Copiar al directorio de systemd de usuario
mkdir -p ~/.config/systemd/user
cp systemd/manga-library.service ~/.config/systemd/user/manga-library.service

# Recargar y habilitar (arrancar ahora)
systemctl --user daemon-reload
systemctl --user enable --now manga-library.service

# Ver estado
systemctl --user status manga-library.service
```

El archivo apunta al directorio del repo. Si quieres instalarlo como servicio del sistema (system-wide) copia el archivo a `/etc/systemd/system/` y ajusta `User=` y `WorkingDirectory=` según corresponda.

## Notas sobre Termux-specific behavior

- Los scripts comprueban `termux-wake-lock` y lo usan sólo si está disponible. En Linux estos comandos no existen y se ignoran.
- Si usabas `termux-keepalive.sh`, no es necesario en Linux; usa systemd o `tmux`/`screen` para mantener el proceso.

## Dependencias nativas

- `sharp` requiere `libvips`. Instálalo antes de `npm install` si ves errores durante la compilación.

## Troubleshooting rápido

- Error: puerto ocupado -> detén la instancia previa (`./scripts/stop-bg.sh`) o cambia `PORT` en `.env`.
- `npm install` falla por `sharp` -> instala `libvips-dev` y vuelve a ejecutar `npm install`.

## Ejemplo: variables de entorno útiles

Crear un archivo `.env` en la raíz con:

```
PORT=3000
DB_PATH=./database/manga_library.db
UPLOADS_PATH=./uploads
COVERS_PATH=./uploads/covers
# GEMINI_API_KEY=tu_api_key_aqui
```

---

Si quieres que prepare automáticamente un servicio systemd en tu máquina, dime tu distribución y lo hago por ti.
