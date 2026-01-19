#!/bin/bash
#
# Script de backup automático de la base de datos PostgreSQL
# Guarda backups diarios y mantiene los últimos 7 días
#

# Configuración
BACKUP_DIR="/opt/MangaRead/backups/database"
DATE=$(date +%Y%m%d-%H%M%S)
CONTAINER_NAME="manga_db"
DB_USER="${POSTGRES_USER:-manga_user}"
DB_NAME="${POSTGRES_DB:-manga_db}"
BACKUP_FILE="$BACKUP_DIR/manga_db_backup_$DATE.sql"
RETENTION_DAYS=7

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Mensaje de inicio
echo "🔄 [$(date)] Iniciando backup de base de datos..."

# Realizar backup usando pg_dump desde el contenedor
docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > "$BACKUP_FILE"

# Verificar si el backup fue exitoso
if [ $? -eq 0 ]; then
    # Comprimir el backup
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    # Calcular tamaño
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    
    echo "✅ [$(date)] Backup completado exitosamente"
    echo "📁 Archivo: $BACKUP_FILE"
    echo "📊 Tamaño: $SIZE"
    
    # Eliminar backups antiguos (más de RETENTION_DAYS días)
    find "$BACKUP_DIR" -name "manga_db_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    # Mostrar backups actuales
    echo ""
    echo "📋 Backups disponibles:"
    ls -lh "$BACKUP_DIR" | grep "manga_db_backup_"
    
else
    echo "❌ [$(date)] Error al realizar el backup"
    exit 1
fi
