# 🚀 GUÍA DE INICIO RÁPIDO

## Para Termux (Android)

### Primera vez - Instalación

```bash
# 1. Navega a la carpeta del proyecto
cd /home/dev/manga-library-app

# 2. Ejecuta el instalador
bash install.sh
```

El instalador hará:
- ✅ Instalar Node.js (si no está instalado)
- ✅ Instalar todas las dependencias
- ✅ Crear carpetas necesarias
- ✅ Configurar el proyecto

### Iniciar la aplicación

```bash
# Opción 1: Con npm
npm start

# Opción 2: Con el script de inicio
bash start.sh

# Opción 3: Directamente con node
node server.js
```

### Acceder a la aplicación

Abre tu navegador móvil y ve a:
```
http://localhost:3000
```

O también puedes usar:
```
http://127.0.0.1:3000
```

## Para Linux/macOS/Windows

### Instalación

```bash
# 1. Asegúrate de tener Node.js instalado
node --version
npm --version

# 2. Navega a la carpeta
cd manga-library-app

# 3. Instala dependencias
npm install
```

### Iniciar

```bash
npm start
```

### Acceder

Abre tu navegador:
```
http://localhost:3000
```

## 📱 Primer Uso

1. **Configurar API de Gemini** (opcional pero recomendado)
   - Haz clic en el ícono de configuración (⚙️)
   - Pega tu API key de Gemini
   - O usa la que ya está configurada en `.env`

2. **Subir tu primer manga**
   - Haz clic en el botón **+** (flotante)
   - Selecciona o arrastra tus PDFs
   - La IA los organizará automáticamente

3. **Leer**
   - Haz clic en cualquier manga
   - Disfruta de la lectura
   - El progreso se guarda automáticamente

## 🔧 Comandos Útiles

```bash
# Iniciar en modo desarrollo (auto-reload)
npm run dev

# Ver logs del servidor
# (El servidor mostrará logs en la terminal)

# Detener el servidor
# Presiona Ctrl+C en la terminal
```

## 💡 Tips para Termux

### Mantener el servidor corriendo en segundo plano

```bash
# Instalar tmux
pkg install tmux

# Crear una sesión
tmux new -s manga

# Iniciar el servidor
npm start

# Para salir sin detener: Ctrl+B, luego D
# Para volver: tmux attach -t manga
```

### Evitar que Termux se duerma

```bash
# Obtener wake lock
termux-wake-lock

# Liberar wake lock cuando termines
termux-wake-unlock
```

### Acceder a tus PDFs del almacenamiento

```bash
# Dar permisos de almacenamiento
termux-setup-storage

# Tus PDFs estarán en:
# ~/storage/downloads/  (Descargas)
# ~/storage/shared/     (Almacenamiento compartido)
```

## 🌐 Acceder desde otros dispositivos

Si quieres acceder desde otro dispositivo en tu red local:

1. Obtén tu IP local:
```bash
# En Termux/Linux
ifconfig wlan0 | grep "inet "

# O usa
ip addr show wlan0
```

2. Accede desde otro dispositivo:
```
http://TU_IP:3000
```

Por ejemplo: `http://192.168.1.100:3000`

## ❓ Problemas Comunes

### "npm: command not found"
**Solución**: Node.js no está instalado. Ejecuta `bash install.sh`

### "Puerto ya en uso"
**Solución**: Cambia el puerto en `.env`:
```env
PORT=8080
```

### No puedo subir PDFs
**Solución**: 
- En Termux: Ejecuta `termux-setup-storage`
- Verifica permisos de la carpeta `uploads/`

### La IA no funciona
**Solución**: Verifica tu API key en Configuración

## 📞 Necesitas ayuda?

Revisa el archivo `README.md` completo para más detalles.

---

¡Disfruta tu biblioteca de mangas! 📚✨
