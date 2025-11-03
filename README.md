# 📚 Manga Library App

Aplicación web para gestionar tu biblioteca personal de mangas y yaoi con **organización automática** usando inteligencia artificial de **Google Gemini**.

![Version](https://img.shields.io/badge/version-1.0.0-purple)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Características

- 📤 **Subida de PDFs** con drag & drop
- 🤖 **IA de Gemini** para identificar automáticamente títulos, volúmenes y géneros
- 📂 **Organización automática** - Mangas de la misma serie se agrupan juntos
- 📖 **Lector de PDF integrado** con navegación táctil
- 📊 **Seguimiento de progreso** - Marca páginas leídas y estado de lectura
- 🎨 **Diseño responsive** - Optimizado para móviles, tablets y desktop
- 🌙 **Modo oscuro** incorporado
- 📱 **Optimizado para Termux** (Android)

## 🛠️ Tecnologías

- **Backend**: Node.js + Express
- **Base de datos**: SQLite3
- **IA**: Google Gemini API
- **Frontend**: HTML5 + TailwindCSS + Vanilla JavaScript
- **Lector PDF**: PDF.js

## 📋 Requisitos Previos

### Para Termux (Android)

```bash
# Actualizar paquetes
pkg update && pkg upgrade

# Instalar Node.js
pkg install nodejs

# Dar acceso al almacenamiento
termux-setup-storage
```

### Para Linux/macOS/Windows

- Node.js >= 16.0.0
- npm o yarn

## 🚀 Instalación

### 1. Clonar o descargar el proyecto

```bash
cd /home/dev/manga-library-app
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar con tu API key de Gemini
nano .env
```

Edita el archivo `.env`:

```env
PORT=3000
GEMINI_API_KEY=tu_api_key_de_gemini_aqui
DB_PATH=./database/manga_library.db
UPLOADS_PATH=./uploads
```

### 4. Obtener API Key de Gemini (GRATIS)

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en "Create API Key"
4. Copia la API key y pégala en el archivo `.env`

**Nota**: También puedes configurarla más tarde desde la interfaz web en **Configuración**.

## 🎮 Uso

### Iniciar el servidor

```bash
npm start
```

O en modo desarrollo con auto-reload:

```bash
npm run dev
```

### Acceder a la aplicación

Abre tu navegador y ve a:

```
http://localhost:3000
```

**En Termux**: Desde tu navegador móvil, también puedes usar:
```
http://127.0.0.1:3000
```

## 📖 Guía de Uso

### 1. Configurar API de Gemini

- Ve a **Configuración** (icono de engranaje)
- Pega tu API key de Gemini
- Haz clic en **Guardar API Key**

### 2. Subir Mangas

- Haz clic en el botón **+** (flotante)
- Arrastra y suelta tus PDFs o haz clic para buscarlos
- La aplicación procesará automáticamente los archivos

### 3. Nomenclatura Recomendada

Para mejores resultados con la IA:

✅ **Bien**:
- `Killing Stalking Vol 1.pdf`
- `Given - Capitulo 15.pdf`
- `Ten Count Tomo 03.pdf`
- `Love Stage.pdf`

❌ **Evitar**:
- `manga_001.pdf`
- `Download (1).pdf`
- Nombres sin información del manga

### 4. Leer Mangas

- Haz clic en cualquier manga de tu biblioteca
- Si tiene múltiples volúmenes, selecciona uno
- Navega:
  - **Tocar izquierda**: Página anterior
  - **Tocar derecha**: Página siguiente
  - **Tocar centro**: Mostrar/ocultar controles
  - **Gestos de pinch**: Zoom
  - **Teclado**: Flechas, +/- para zoom

### 5. Seguimiento de Progreso

El progreso se guarda automáticamente:
- 🔘 **Sin leer**: No iniciado
- ⏱️ **Leyendo**: En progreso
- ✅ **Completado**: Terminado

## 📁 Estructura del Proyecto

```
manga-library-app/
├── server.js                 # Servidor principal
├── package.json             # Dependencias
├── .env                     # Configuración (crear desde .env.example)
├── database/               
│   └── manga_library.db     # Base de datos SQLite (se crea automáticamente)
├── uploads/                 # PDFs subidos
├── server/
│   ├── database.js          # Manejo de base de datos
│   └── services/
│       └── gemini-service.js # Servicio de IA
└── public/
    ├── library.html         # Página principal
    ├── upload.html          # Subir PDFs
    ├── reader.html          # Lector de PDF
    ├── settings.html        # Configuración
    └── js/
        ├── library.js       # Lógica de biblioteca
        ├── upload.js        # Lógica de subida
        ├── reader.js        # Lógica del lector
        └── settings.js      # Lógica de configuración
```

## 🔧 API Endpoints

### Series/Mangas

- `GET /api/series` - Obtener todas las series
- `GET /api/series/:id/volumes` - Obtener volúmenes de una serie

### Volúmenes

- `GET /api/volumes/:id` - Obtener un volumen específico
- `PUT /api/volumes/:id/progress` - Actualizar progreso de lectura

### Upload

- `POST /api/upload` - Subir un PDF (multipart/form-data)

### Configuración

- `GET /api/settings` - Estado de configuración
- `POST /api/settings` - Guardar API key

### Estadísticas

- `GET /api/stats` - Estadísticas generales
- `GET /api/recently-read` - Mangas leídos recientemente

## 🐛 Solución de Problemas

### Error: "Gemini API no configurada"

**Solución**: Configura tu API key en Configuración o en el archivo `.env`

### Error: "Puerto ya en uso"

**Solución**: Cambia el puerto en `.env`:
```env
PORT=8080
```

### Los PDFs no se suben

**Solución**: 
- Verifica que la carpeta `uploads/` tenga permisos de escritura
- En Termux: Asegúrate de haber ejecutado `termux-setup-storage`

### La IA no detecta correctamente los mangas

**Solución**:
- Verifica que la API key sea válida
- Usa nombres de archivo descriptivos
- El sistema tiene un fallback que funciona sin IA pero es menos preciso

## 🔒 Seguridad

- La API key se almacena localmente en la base de datos
- Los PDFs se almacenan en el servidor (no se suben a la nube)
- Recomendado para uso personal/local

## 📝 Notas para Termux

### Mantener el servidor corriendo

```bash
# Instalar tmux
pkg install tmux

# Crear sesión
tmux new -s manga-app

# Iniciar servidor
npm start

# Desconectar: Ctrl+B, luego D
# Reconectar: tmux attach -t manga-app
```

### Acceder desde otros dispositivos en la red local

1. Obtén tu IP local:
```bash
ifconfig wlan0 | grep "inet "
```

2. Accede desde otro dispositivo:
```
http://TU_IP:3000
```

3. Para acceso externo, considera usar Ngrok:
```bash
pkg install ngrok
ngrok http 3000
```

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - Siéntete libre de usar este proyecto como desees.

## 🙏 Agradecimientos

- Google Gemini por la API de IA
- PDF.js por el lector de PDF
- TailwindCSS por el framework CSS
- La comunidad de Termux

## 📧 Soporte

Si tienes problemas o sugerencias, abre un issue en el repositorio.

---

Hecho con 💜 para amantes del manga y yaoi
