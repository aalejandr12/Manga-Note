# 🛡️ Guía de Protección de Datos - Manga App

## 📊 Estado Actual de tus Datos

### ✅ Datos Protegidos

Tu configuración actual tiene **3 capas de protección**:

#### 1. **Base de Datos PostgreSQL** (20KB)
```yaml
Volumen: manga-app_db_data
Ubicación: /var/lib/docker/volumes/manga-app_db_data/_data
Contenido: Mangas, calificaciones, favoritos, notas, series
Estado: ✅ PERSISTENTE
```

#### 2. **Portadas de Manga** (536MB)
```yaml
Bind Mount: ./data/covers → /usr/src/app/data/covers
Ubicación física: /opt/MangaRead/manga-app/data/covers/
Contenido: Todas las portadas de tus mangas
Estado: ✅ PERSISTENTE (en tu disco duro)
```

#### 3. **Webcomic API**
```yaml
Volúmenes: manga-app_webcomic_data, manga-app_webcomic_logs
Contenido: Configuración y logs de webcomics
Estado: ✅ PERSISTENTE
```

---

## 🔄 Sistema de Backups Automático

### Hacer Backup Manual

```bash
cd /home/aledev/Escritorio/opt/MangaRead/manga-app
./scripts/backup-db.sh
```

**Resultado:**
- Se guarda en `/opt/MangaRead/backups/database/`
- Formato: `manga_db_backup_YYYYMMDD-HHMMSS.sql.gz`
- Se mantienen los últimos 7 días automáticamente

### Restaurar un Backup

```bash
# 1. Ver backups disponibles
ls -lh /opt/MangaRead/backups/database/

# 2. Restaurar (¡CUIDADO! Sobrescribe la DB actual)
cd /home/aledev/Escritorio/opt/MangaRead/manga-app
./scripts/restore-db.sh /opt/MangaRead/backups/database/manga_db_backup_FECHA.sql.gz
```

### Configurar Backup Automático Diario

Para que se haga un backup automático cada día a las 3:00 AM:

```bash
# Editar crontab
crontab -e

# Agregar esta línea:
0 3 * * * /home/aledev/Escritorio/opt/MangaRead/manga-app/scripts/backup-db.sh >> /var/log/manga-backup.log 2>&1
```

---

## ⚠️ Comandos Docker: Seguros vs Peligrosos

### ✅ COMANDOS SEGUROS (tus datos permanecen)

```bash
# Reconstruir imagen (NO afecta datos)
docker-compose build

# Reiniciar contenedores (NO afecta datos)
docker-compose down
docker-compose up -d

# Reconstruir y reiniciar (NO afecta datos)
docker-compose up -d --build

# Ver logs
docker-compose logs -f manga_app

# Reiniciar solo un servicio
docker-compose restart manga_app
```

### ❌ COMANDOS PELIGROSOS (¡BORRAN DATOS!)

```bash
# ❌ BORRA TODOS LOS VOLÚMENES (¡PIERDES TODO!)
docker-compose down -v

# ❌ BORRA TODO EL SISTEMA DOCKER
docker system prune -a --volumes

# ❌ BORRA UN VOLUMEN ESPECÍFICO
docker volume rm manga-app_db_data
```

**REGLA DE ORO:** 
> **NUNCA uses la opción `-v` con `docker-compose down`**

---

## 🚨 ¿Qué hacer si perdiste datos?

### Paso 1: No entrar en pánico
Tus portadas siguen en `/opt/MangaRead/manga-app/data/covers/`

### Paso 2: Verificar volúmenes
```bash
docker volume ls | grep manga
```

### Paso 3: Restaurar backup (si existe)
```bash
# Ver backups disponibles
ls -lh /opt/MangaRead/backups/database/

# Restaurar el más reciente
cd /home/aledev/Escritorio/opt/MangaRead/manga-app
./scripts/restore-db.sh /opt/MangaRead/backups/database/[archivo_mas_reciente].sql.gz
```

### Paso 4: Si no hay backup
Tendrás que re-escanear tus mangas desde la interfaz web

---

## 📋 Checklist de Seguridad

Antes de cualquier operación importante:

- [ ] ¿Hiciste un backup reciente?
- [ ] ¿Estás seguro del comando que vas a ejecutar?
- [ ] ¿El comando incluye `-v`? → ¡PELIGRO!
- [ ] ¿Necesitas ayuda? → Pregunta primero

---

## 🎯 Resumen

**Tu configuración actual ES SEGURA:**
- ✅ Volúmenes persistentes configurados correctamente
- ✅ Portadas en bind mount (disco duro físico)
- ✅ Sistema de backup disponible
- ✅ Hot-reload activado (los cambios se sincronizan en tiempo real)

**Para mayor seguridad:**
1. Configura el backup automático diario (crontab)
2. Antes de hacer `docker-compose down`, verifica que NO uses `-v`
3. Haz backups manuales antes de cambios grandes

**¿Perdiste datos antes?**
Probablemente fue por usar `docker-compose down -v` accidentalmente. 
¡Ahora sabes cómo evitarlo! 😊
