# 🔄 Migración desde Komga - Inicio Rápido

## ✅ Cambios Realizados

### 1. Inputs con fondo blanco ✨
- Los campos de texto ahora tienen fondo blanco con texto negro
- Mucho más fácil de leer en el formulario

### 2. Script de migración desde Komga 📚
- Importa automáticamente tu colección de Komga
- Copia portadas, estados de lectura y progreso

## 🚀 Cómo Migrar desde Komga

### Opción 1: Migración Rápida (Recomendada)

```bash
# 1. Ejecutar el script de migración
sudo docker exec -it manga_app npm run migrate:komga
```

### Opción 2: Personalizar Rutas

Si tu Komga está en otra ubicación:

```bash
# 1. Editar .env
nano /opt/MangaRead/manga-app/.env

# 2. Cambiar estas líneas:
KOMGA_DB_PATH=/tu/ruta/a/database.sqlite
KOMGA_COVERS_PATH=/tu/ruta/a/Mangas

# 3. Reconstruir contenedor
cd /opt/MangaRead/manga-app
sudo docker-compose down
sudo docker-compose up --build -d

# 4. Ejecutar migración
sudo docker exec -it manga_app npm run migrate:komga
```

## 📊 ¿Qué se Importa?

| Dato | Se importa | Notas |
|------|------------|-------|
| Nombre de la serie | ✅ | Tal cual |
| Estado (leyendo/terminado/etc) | ✅ | Automático según progreso |
| Capítulos leídos | ✅ | Basado en volúmenes de Komga |
| Portada | ✅ | Copia la primera imagen encontrada |
| Calificación | ❌ | Deberás agregarla manualmente |
| Comentarios | ⚠️ | Se agrega texto genérico |
| Enlaces | ❌ | Deberás agregarlos manualmente |

## 🎯 Después de Migrar

1. Abre http://localhost:3000
2. Verás tus mangas importados
3. Puedes editar cada uno para:
   - Agregar calificación
   - Agregar comentarios personales
   - Agregar enlaces de lectura
   - Corregir tipo (manga/manhwa/manhua)

## 📖 Documentación Completa

Para más detalles, consulta: `docs/MIGRACION_KOMGA.md`

---

¡Listo! Tu colección de Komga ahora está en la nueva app 🎉
