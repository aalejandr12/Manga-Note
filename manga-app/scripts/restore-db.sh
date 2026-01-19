#!/bin/bash
#
# Script para restaurar un backup de la base de datos PostgreSQL
# Uso: ./restore-db.sh [archivo_backup.sql.gz]
#

CONTAINER_NAME="manga_db"
DB_USER="${POSTGRES_USER:-manga_user}"
DB_NAME="${POSTGRES_DB:-manga_db}"

# Verificar que se proporcionó un archivo
if [ -z "$1" ]; then
    echo "❌ Error: Debes especificar el archivo de backup"
    echo "Uso: $0 [archivo_backup.sql.gz]"
    echo ""
    echo "📋 Backups disponibles:"
    ls -lh /opt/MangaRead/backups/database/ | grep "manga_db_backup_"
    exit 1
fi

BACKUP_FILE="$1"

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: El archivo '$BACKUP_FILE' no existe"
    exit 1
fi

# Confirmar con el usuario
echo "⚠️  ADVERTENCIA: Esta operación sobrescribirá la base de datos actual"
echo "📁 Archivo a restaurar: $BACKUP_FILE"
echo ""
read -p "¿Estás seguro de continuar? (escribe 'SI' para confirmar): " CONFIRM

if [ "$CONFIRM" != "SI" ]; then
    echo "❌ Restauración cancelada"
    exit 0
fi

echo ""
echo "🔄 [$(date)] Iniciando restauración de base de datos..."

# Descomprimir si está comprimido
if [[ $BACKUP_FILE == *.gz ]]; then
    echo "📦 Descomprimiendo backup..."
    TEMP_FILE="/tmp/manga_restore_temp.sql"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
else
    TEMP_FILE="$BACKUP_FILE"
fi

# Restaurar la base de datos
echo "⏳ Restaurando base de datos..."
cat "$TEMP_FILE" | docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME

# Verificar resultado
if [ $? -eq 0 ]; then
    echo "✅ [$(date)] Restauración completada exitosamente"
    
    # Limpiar archivo temporal si se descomprimió
    if [[ $BACKUP_FILE == *.gz ]]; then
        rm "$TEMP_FILE"
    fi
else
    echo "❌ [$(date)] Error durante la restauración"
    exit 1
fi
