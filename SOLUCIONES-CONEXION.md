# 🔧 SOLUCIONES PARA MANTENER EL SERVIDOR ESTABLE

## Problema resuelto: Auto-reinicio automático

He creado **`keepalive.sh`** que mantiene el servidor siempre corriendo. Si se cae por cualquier razón, se reinicia automáticamente en 3 segundos.

## ✅ Servidor ya iniciado con keepalive

El servidor ahora está corriendo con auto-reinicio. Puedes verificar:

```bash
# Ver log en tiempo real
tail -f /tmp/manga_keepalive.log

# Ver si está corriendo
curl http://localhost:3000/api/series
```

## 🛠️ Comandos útiles

### Ver estado del servidor
```bash
ps aux | grep "node server.js"
```

### Reiniciar manualmente
```bash
pkill -f keepalive
./keepalive.sh &
```

### Ver logs
```bash
tail -f /tmp/manga_keepalive.log
```

## 📊 Sobre los "errores" de VS Code

Los mensajes que mostraste **NO son errores de tu app**, son solo advertencias de VS Code sobre sus propias extensiones internas (git, github) que usan activación "*" (se cargan al inicio).

**No afectan:**
- ❌ Tu servidor Node
- ❌ La conexión
- ❌ El funcionamiento de la app

**Solo afectan:**
- ⚠️ Rendimiento de VS Code (insignificante)

Para silenciarlos (opcional):
1. Abre configuración de VS Code
2. Busca "extension warnings"
3. Desactiva advertencias de activación

## 🚀 Mejoras implementadas

1. **Auto-reinicio** - Si el servidor se cae, se levanta solo
2. **Logs centralizados** - Todo en `/tmp/manga_keepalive.log`
3. **Sin interrupciones** - Funciona en background
4. **Optimizado para Termux** - Configuración específica

## 📱 Conectar desde tu PC

Ahora que el servidor es estable, desde tu PC:

```bash
# Windows
set SERVER_URL=http://100.79.185.4:3000
node "Portada Manga Library.js"

# Linux/Mac
SERVER_URL=http://100.79.185.4:3000 node "Portada Manga Library.js"
```

O usa los scripts que creé:
- Windows: `ejecutar-desde-pc.bat`
- Linux/Mac: `./ejecutar-desde-pc.sh`

## 🔄 Si aún pierdes conexión

Es probable que sea por:

### 1. Red WiFi inestable
- Asegúrate de que PC y Android estén en la misma red
- Prueba conectar ambos por cable si es posible

### 2. Firewall/Router
- Verifica que el puerto 3000 no esté bloqueado
- Prueba con otro puerto: edita `PORT=3001` en `.env`

### 3. Termux en background
- Termux a veces se pausa en background
- Usa `termux-wake-lock` para mantenerlo activo:
```bash
termux-wake-lock
```

### 4. Límites de memoria
- Si el dispositivo tiene poca RAM, el servidor puede cerrarse
- El keepalive lo reiniciará automáticamente

## ✨ Resultado

**Antes:** Servidor se caía → tenías que reiniciar manualmente  
**Ahora:** Servidor se reinicia solo → siempre disponible

El servidor ya está corriendo con esta protección. Prueba desde tu PC ahora.
