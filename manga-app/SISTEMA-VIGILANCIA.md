# 📚 Sistema de Vigilancia de Mangas - Documentación

## ✅ Configuración Completa y Persistente

### 🔄 Persistencia Garantizada

El sistema está configurado para **sobrevivir a cualquier reinicio**:

#### 1. **Docker Compose** (`docker-compose.yml`)
```yaml
app:
  restart: unless-stopped  # ← Se reinicia automáticamente
```

#### 2. **Dockerfile** (imagen con cron incluido)
```dockerfile
# Instalar dcron
RUN apk add --no-cache openssl dcron

# Configurar cron job permanente
RUN echo "0 * * * * cd /usr/src/app && node scripts/vigilar-mangas.js >> /var/log/vigilancia-mangas.log 2>&1" > /etc/crontabs/root

# Iniciar cron junto con la aplicación
CMD ["sh", "-c", "crond && npx prisma migrate deploy && npm start"]
```

### ⏰ Cron Job Configurado

**Frecuencia:** Cada hora en punto (0 * * * *)
- 00:00, 01:00, 02:00, ..., 23:00

**Comando ejecutado:**
```bash
cd /usr/src/app && node scripts/vigilar-mangas.js >> /var/log/vigilancia-mangas.log 2>&1
```

### 📊 Funcionalidades

1. **Detección automática de nuevos capítulos**
   - Consulta API de cada manga vigilado
   - Compara capítulos actuales vs disponibles
   - Detecta incrementos

2. **Notificaciones Push a iOS**
   - Título: "Nombre Manga - X nuevos capítulos"
   - Cuerpo: "¡Ya están disponibles para leer!"
   - Compatible con iOS Safari PWA

3. **Sistema de Cola**
   - Procesa un manga por vez
   - 1 segundo de delay entre solicitudes
   - Evita saturar APIs externas

4. **Badge Visual "NEW"**
   - Aparece automáticamente en la UI
   - Se elimina al abrir el manga

### 📝 Logs Persistentes

**Ubicación:** `/var/log/vigilancia-mangas.log`

**Ver en tiempo real:**
```bash
sudo docker exec manga_app tail -f /var/log/vigilancia-mangas.log
```

### 🛠️ Comandos Útiles

**Ver estado completo:**
```bash
/opt/MangaRead/manga-app/scripts/estado-vigilancia.sh
```

**Ejecutar vigilancia manualmente:**
```bash
sudo docker exec manga_app node /usr/src/app/scripts/vigilar-mangas.js
```

**Ver logs:**
```bash
sudo docker exec manga_app tail -20 /var/log/vigilancia-mangas.log
```

**Verificar cron:**
```bash
sudo docker exec manga_app crontab -l
sudo docker exec manga_app ps aux | grep crond
```

### 🔧 Reinicio del Sistema

**Si reinicias el servidor Linux:**
1. Docker service se inicia automáticamente
2. `manga_app` y `manga_db` se levantan con `restart: unless-stopped`
3. `crond` se inicia automáticamente en `manga_app`
4. Vigilancia continúa funcionando

**Si reinicias solo el contenedor:**
```bash
sudo docker restart manga_app
```
→ Cron se reinicia automáticamente

### 📱 Notificaciones Push (iOS Safari PWA)

**Configuración:**
- VAPID keys en `.env`
- Service Worker registrado
- Subscription guardada en PostgreSQL

**Formato optimizado para iOS:**
- Sin imágenes grandes (iOS no las soporta)
- Título descriptivo con nombre del manga
- Mensaje claro y conciso

### 🧪 Verificar que Todo Funciona

```bash
# 1. Verificar cron activo
sudo docker exec manga_app ps aux | grep crond

# 2. Ver cron job configurado
sudo docker exec manga_app crontab -l

# 3. Ver mangas vigilados
sudo docker exec manga_db psql -U manga_user -d manga_db -c \
  "SELECT titulo, vigilarManga, capitulosDisponibles FROM mangas WHERE vigilarManga = true;"

# 4. Probar manualmente
sudo docker exec manga_app node /usr/src/app/scripts/vigilar-mangas.js

# 5. Ver logs
sudo docker exec manga_app tail -10 /var/log/vigilancia-mangas.log
```

### 🚀 Estado Actual

✅ Cron job: Activo (PID 9)
✅ Configuración: Cada hora en punto
✅ Mangas vigilados: 5
✅ Notificaciones: Funcionando (iOS Safari PWA)
✅ Persistencia: Garantizada en reinicios
✅ Sistema de cola: Activo (1 solicitud/vez, 1s delay)

---

**Última actualización:** 3 de diciembre de 2025
**Versión del sistema:** 1.0.0
