# 🔧 Solución de Desconexiones en Termux

## Problema
El servidor se detiene o desconecta cuando Termux está en segundo plano debido a optimizaciones de Android.

## Soluciones

### 1. Usar Wake Lock (RECOMENDADO)
```bash
# Instalar Termux:API (desde F-Droid, no Google Play)
pkg install termux-api

# Usar el script con wake-lock
./scripts/termux-keepalive.sh
```

### 2. Desactivar Optimización de Batería
1. Abre **Ajustes de Android**
2. Ve a **Aplicaciones** → **Termux**
3. Busca **Batería** u **Optimización de batería**
4. Selecciona **No optimizar**

### 3. Mantener Termux en Primer Plano
- Mantén la app de Termux abierta (minimizada está bien)
- Usa la notificación de Termux para volver rápidamente

### 4. Usar Termux:Boot (Inicio Automático)
```bash
# Instalar Termux:Boot
pkg install termux-boot

# Crear script de inicio automático
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/manga-library.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd ~/manga-library-app
./start.sh
EOF

chmod +x ~/.termux/boot/manga-library.sh
```

### 5. Comando Manual de Wake Lock
```bash
# Activar wake-lock
termux-wake-lock

# Iniciar servidor
./start.sh

# Liberar wake-lock (cuando quieras detener)
termux-wake-unlock
```

## Scripts Disponibles

### Inicio Normal
```bash
./start.sh
```

### Inicio con Wake Lock
```bash
./scripts/termux-keepalive.sh
```

### Ver Estado
```bash
./scripts/status.sh
```

### Detener Servidor
```bash
./scripts/stop.sh
```

## Verificar Salud del Servidor

```bash
# Ver logs en tiempo real
tail -f logs/server.log

# Verificar proceso
./scripts/status.sh

# Probar endpoints
curl http://localhost:3000/api/stats
```

## Acceso Remoto vía Tailscale

Si quieres acceder desde otros dispositivos:

```bash
# Instalar Tailscale en Termux
pkg install tailscale

# Iniciar Tailscale
tailscaled &
tailscale up

# Ver tu IP de Tailscale
tailscale ip

# Acceder desde otro dispositivo:
# http://[TU-IP-TAILSCALE]:3000
```

## Troubleshooting

### Servidor se detiene constantemente
- ✅ Activa wake-lock: `termux-wake-lock`
- ✅ Desactiva optimización de batería para Termux
- ✅ Mantén Termux en primer plano

### No puedo acceder al servidor
```bash
# Verificar que esté corriendo
./scripts/status.sh

# Reiniciar si está detenido
./scripts/stop.sh
./start.sh
```

### Error "Address already in use"
```bash
# Detener proceso en puerto 3000
./scripts/stop.sh

# Si persiste, matar manualmente
pkill -f "node server.js"

# Reiniciar
./start.sh
```

## Notas Importantes

⚠️ **Termux:API debe instalarse desde F-Droid, NO desde Google Play**
   - La versión de Google Play está desactualizada y no funciona
   - URL: https://f-droid.org/packages/com.termux.api/

⚠️ **Android 12+** puede ser más agresivo matando procesos
   - Usa wake-lock siempre
   - Considera usar Termux:Boot para inicio automático

✅ **Mejores prácticas**
   - Usa `./scripts/termux-keepalive.sh` para producción
   - Monitorea logs: `tail -f logs/server.log`
   - Desactiva doze/optimización de batería para Termux
