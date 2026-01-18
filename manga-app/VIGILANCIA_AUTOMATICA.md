# 🔍 Sistema de Vigilancia Automática de Mangas

## ✅ Configuración Completada

### 📅 Frecuencia de Ejecución
El script de vigilancia se ejecuta **automáticamente cada hora** (minuto 0 de cada hora: 00:00, 01:00, 02:00, etc.)

### 🔄 Funcionamiento después de reiniciar
**SÍ**, el sistema está configurado para funcionar automáticamente después de reiniciar el servidor:

1. ✅ **Servicio cron** habilitado para inicio automático
2. ✅ **Contenedor Docker** configurado con `restart: unless-stopped`
3. ✅ **Servicio webcomic-api** habilitado con systemd

### 📂 Archivos Configurados

#### Script de Cron
- **Ubicación**: `/opt/MangaRead/manga-app/scripts/cron-vigilar.sh`
- **Función**: Ejecuta la vigilancia y guarda logs
- **Permisos**: Ejecutable

#### Crontab
```bash
# Ver configuración actual
sudo crontab -l

# Configuración:
0 * * * * /opt/MangaRead/manga-app/scripts/cron-vigilar.sh
```

#### Logs
- **Ubicación**: `/opt/MangaRead/manga-app/logs/vigilancia-cron.log`
- **Rotación**: Se mantienen las últimas 1000 líneas automáticamente

### 📊 Comandos Útiles

#### Ver el estado actual
```bash
# Ver últimos logs de vigilancia
tail -f /opt/MangaRead/manga-app/logs/vigilancia-cron.log

# Ver crontab configurado
sudo crontab -l

# Verificar servicio cron
sudo systemctl status cron
```

#### Ejecutar manualmente
```bash
# Ejecutar vigilancia inmediatamente
/opt/MangaRead/manga-app/scripts/cron-vigilar.sh

# O desde Docker
cd /opt/MangaRead/manga-app
sudo docker exec manga_app node scripts/vigilar-mangas.js
```

#### Modificar frecuencia
```bash
# Editar crontab
sudo crontab -e

# Ejemplos de frecuencias:
# Cada 30 minutos: */30 * * * *
# Cada 2 horas: 0 */2 * * *
# Cada 6 horas: 0 */6 * * *
# Una vez al día (medianoche): 0 0 * * *
```

### 🔧 Servicios que deben estar corriendo

1. **Docker containers**
   ```bash
   sudo docker ps
   # Debe mostrar: manga_app y manga_db
   ```

2. **Webcomic API**
   ```bash
   sudo systemctl status webcomic-api
   # Debe estar: active (running)
   ```

3. **Servicio Cron**
   ```bash
   sudo systemctl status cron
   # Debe estar: active (running)
   ```

### 🚨 Solución de Problemas

#### Si no se ejecuta automáticamente

1. Verificar que cron esté corriendo:
   ```bash
   sudo systemctl status cron
   sudo systemctl start cron
   ```

2. Ver errores en el log:
   ```bash
   tail -50 /opt/MangaRead/manga-app/logs/vigilancia-cron.log
   ```

3. Verificar permisos del script:
   ```bash
   ls -l /opt/MangaRead/manga-app/scripts/cron-vigilar.sh
   # Debe tener: -rwxr-xr-x
   ```

#### Si el contenedor no está corriendo

```bash
cd /opt/MangaRead/manga-app
sudo docker-compose up -d
```

#### Si la API no responde

```bash
sudo systemctl restart webcomic-api
sudo systemctl status webcomic-api
```

### 📱 Sistema de Notificaciones

Cuando se detectan nuevos capítulos:
- ✅ Se envían **notificaciones push** automáticamente
- ✅ Se actualiza la base de datos
- ✅ Se registra en el log

**Nota**: Las notificaciones solo se envían cuando hay un **incremento** en el número de capítulos, no en la primera sincronización.

### 🔥 Configuración de Firewall (UFW)

Reglas necesarias para que Docker acceda a la API:
```bash
# Ver reglas actuales
sudo ufw status numbered

# Reglas configuradas:
- 10.0.2.0/24 -> puerto 8001 (red Docker manga_network)
- 10.0.0.0/24 -> puerto 8001 (bridge docker0)
- br-8a146709cec5 -> puerto 8001 (bridge específico)
```

### ⚙️ Configuración Actual

- **Frecuencia**: Cada hora (0 * * * *)
- **Modo Chrome**: Headless (sin ventana visible)
- **Timeout API**: 120 segundos
- **Plataformas soportadas**: Lezhin Comics, Coolmic
- **Mangas vigilados**: 5 activos

### 📈 Tiempos de Respuesta

- **Coolmic**: ~8 segundos
- **Lezhin Comics**: ~19 segundos
- **Total por ejecución**: ~60-90 segundos (depende del número de mangas)

---

**Última actualización**: 4 de diciembre de 2025
