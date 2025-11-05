# 📚 Manga Organizer

Aplicación web para subir y organizar automáticamente archivos PDF de manga usando la API de Google Gemini.

## 🚀 Características

- **Interfaz web intuitiva** con drag & drop para subir PDFs
- **Análisis automático** de nombres de archivos usando IA (Google Gemini)
- **Organización inteligente** por carpetas según la serie
- **Renombrado automático** con formato estandarizado
- **Detección de capítulos, rangos y extras**
- **Agrupación de series** incluso con nombres ligeramente diferentes

## 📋 Requisitos Previos

- Python 3.8 o superior
- Una API Key de Google Gemini (gratuita en [Google AI Studio](https://makersuite.google.com/app/apikey))

## 🔧 Instalación

### 1. Instalar dependencias

```bash
cd /opt/MangaRead/manga-organizer
pip install -r requirements.txt
```

### 2. Configurar la API Key de Gemini

Edita el archivo `config.py` y reemplaza `TU_API_KEY_AQUI` con tu API key real:

```python
GOOGLE_API_KEY = 'tu_api_key_aqui'
```

**Alternativa (más segura):** Usa una variable de entorno:

```bash
export GOOGLE_API_KEY='tu_api_key_aqui'
```

### 3. Verificar las rutas

En `config.py`, asegúrate de que las rutas sean correctas:

```python
MANGA_DESTINATION = '/opt/MangaRead/Mangas'  # Carpeta donde se organizarán los mangas
PORT = 5000  # Puerto del servidor web
```

## ▶️ Uso

### Iniciar el servidor

```bash
cd /opt/MangaRead/manga-organizer
python app.py
```

El servidor se iniciará en `http://0.0.0.0:5000`

### Acceder desde otros dispositivos

- **Red local:** `http://192.168.0.38:5000` (usa tu IP local)
- **Tailscale:** `http://100.83.250.127:5000` (usa tu IP de Tailscale)

### Subir y organizar mangas

1. Abre la interfaz web en tu navegador
2. Arrastra archivos PDF o haz clic para seleccionarlos
3. Haz clic en "🚀 Organizar Mangas"
4. Espera a que Gemini analice y organice los archivos
5. Revisa los resultados en la pantalla

## 📁 Estructura de Carpetas Resultante

```
/opt/MangaRead/Mangas/
├── Off Track Crush/
│   ├── Off Track Crush extra - Cap. 1-6.pdf
│   └── Off Track Crush - Cap. 7-12.pdf
├── Mi Irresistible Vecino/
│   └── Mi Irresistible Vecino - Cap. 1-32.pdf
└── Wolf Teacher & Tiger Daddy/
    ├── Wolf Teacher & Tiger Daddy - Cap. ONE_SHOT.pdf
    └── Mairirn Wolf Teacher & Tiger Daddy Another Special Ordinary Day - Cap. ONE_SHOT.pdf
```

## 🔥 Ejecutar como Servicio (Opcional)

Para que el servidor se inicie automáticamente con el sistema, puedes crear un servicio de systemd o usar Docker.

### Con Docker

Crea un `Dockerfile` en `/opt/MangaRead/manga-organizer/`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

ENV GOOGLE_API_KEY=""

CMD ["python", "app.py"]
```

Luego ejecuta:

```bash
cd /opt/MangaRead/manga-organizer
docker build -t manga-organizer .
docker run -d \
  --name manga-organizer \
  -p 5000:5000 \
  -e GOOGLE_API_KEY='tu_api_key' \
  -v /opt/MangaRead/Mangas:/opt/MangaRead/Mangas \
  -v /opt/MangaRead/manga-organizer/uploads:/app/uploads \
  --restart unless-stopped \
  manga-organizer
```

## 🛠️ Configuración Avanzada

### Cambiar el modelo de Gemini

En `config.py`:

```python
GEMINI_MODEL = 'gemini-2.0-flash-exp'  # Rápido y eficiente
# GEMINI_MODEL = 'gemini-2.5-pro'  # Más preciso pero más lento
```

### Ajustar el tamaño máximo de archivo

En `config.py`:

```python
MAX_FILE_SIZE_MB = 100  # Tamaño máximo por archivo en MB
```

### Cambiar el puerto del servidor

En `config.py`:

```python
PORT = 5000  # Cámbialo si el puerto 5000 está ocupado
```

## 📊 API Endpoints

La aplicación también expone algunos endpoints útiles:

- `GET /` - Interfaz web principal
- `POST /upload` - Sube y organiza archivos PDF
- `GET /status` - Estado del servidor
- `GET /folders` - Lista las carpetas de manga organizadas

## 🐛 Solución de Problemas

### Error: "API Key inválida"

Verifica que tu API key de Gemini sea correcta y esté activa en [Google AI Studio](https://makersuite.google.com/app/apikey).

### Los archivos no se organizan

1. Verifica que la carpeta `/opt/MangaRead/Mangas` exista y tenga permisos de escritura
2. Revisa los logs del servidor en la terminal donde ejecutaste `python app.py`

### El servidor no es accesible desde otros dispositivos

1. Verifica que el cortafuegos permita conexiones en el puerto 5000:
   ```bash
   sudo ufw allow 5000/tcp
   ```
2. Asegúrate de que el servidor esté escuchando en `0.0.0.0` (no en `127.0.0.1`)

## 📝 Licencia

Proyecto de código abierto para uso personal.

## 🤝 Contribuciones

¡Las sugerencias y mejoras son bienvenidas!
