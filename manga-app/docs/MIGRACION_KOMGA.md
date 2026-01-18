# 🔄 Guía de Migración desde Komga

Esta guía te ayudará a importar tu colección de mangas desde Komga a esta aplicación.

## 📋 ¿Qué se importa?

✅ **Datos importados:**
- ✅ Nombre de la serie
- ✅ Estado de lectura (no empezado, leyendo, terminado)
- ✅ Número de volúmenes/capítulos leídos
- ✅ Total de volúmenes
- ✅ Portada (primera imagen encontrada en la carpeta)

⚠️ **Datos NO importados:**
- ❌ Calificaciones (se importan como null)
- ❌ Comentarios personales (se agrega texto automático)
- ❌ Enlaces de lectura (deberás agregarlos manualmente)

## 🚀 Cómo Migrar

### Paso 1: Verificar rutas

Asegúrate de que las rutas en `.env` apunten correctamente a tu instalación de Komga:

```bash
KOMGA_DB_PATH=/opt/MangaRead/komga-config/database.sqlite
KOMGA_COVERS_PATH=/opt/MangaRead/Mangas
```

### Paso 2: Reconstruir contenedor (solo primera vez)

Si es la primera vez que migras, necesitas instalar las dependencias:

```bash
sudo docker-compose down
sudo docker-compose up --build -d
```

### Paso 3: Ejecutar migración

```bash
sudo docker exec -it manga_app npm run migrate:komga
```

### Paso 4: Ver resultados

Abre la aplicación en http://localhost:3000 y verás tus mangas importados.

## 📊 Mapeo de Estados

| Estado en Komga | Estado en la App |
|-----------------|------------------|
| UNREAD (sin leer) | no_empezado |
| IN_PROGRESS (en progreso) | leyendo |
| READ (leído completamente) | terminado |

**Lógica de determinación:**
- Si todos los volúmenes están leídos → **terminado**
- Si hay al menos un volumen leído o en progreso → **leyendo**
- Si no hay nada leído → **no_empezado**

## 📁 Búsqueda de Portadas

El script busca portadas en este orden:

1. **Archivo con "cover" en el nombre**: `cover.jpg`, `cover.png`, etc.
2. **Primera imagen encontrada**: cualquier `.jpg`, `.jpeg`, `.png`, `.webp`

Si no encuentra ninguna imagen, el manga se importa sin portada.

## 🔍 Ejemplo de Salida

```
🚀 Iniciando migración desde Komga...

✅ Conectado a la base de datos de Komga
📚 Encontradas 156 series en Komga

📥 Iniciando importación...

📖 Procesando: One Piece
   Estado: leyendo
   Capítulos leídos: 1044/1070
   ✅ Portada copiada: cover.jpg → cover-1701432000-123456789.jpg
   ✅ Importado con ID: 1

📖 Procesando: Berserk
   Estado: no_empezado
   ⚠️  No se encontró portada en: /opt/MangaRead/Mangas/Berserk
   ✅ Importado con ID: 2

==================================================
📊 RESUMEN DE MIGRACIÓN
==================================================
✅ Series importadas: 154
❌ Errores: 2
📚 Total procesadas: 156
==================================================

✨ Migración completada!
```

## ⚠️ Notas Importantes

1. **No duplica datos**: Si vuelves a ejecutar la migración, se crearán duplicados. El script no verifica si ya existen.

2. **Portadas**: Las portadas se copian, no se mueven. Tus archivos originales están seguros.

3. **Rendimiento**: Procesa ~10-20 series por segundo dependiendo del tamaño de las portadas.

4. **Espacio**: Asegúrate de tener espacio suficiente en `./data/covers/` para las portadas.

## 🛠️ Solución de Problemas

### Error: "No se encontró la base de datos de Komga"

```bash
# Verificar que la ruta existe
ls -la /opt/MangaRead/komga-config/database.sqlite

# Si está en otra ubicación, actualizar .env
KOMGA_DB_PATH=/tu/ruta/a/database.sqlite
```

### Error: "No se encontró la carpeta de Mangas"

```bash
# Verificar la ruta
ls -la /opt/MangaRead/Mangas

# Actualizar en .env si es diferente
KOMGA_COVERS_PATH=/tu/ruta/a/Mangas
```

### No se importan las portadas

1. Verificar que las carpetas de mangas tienen imágenes
2. Verificar permisos de lectura
3. Las imágenes deben ser: `.jpg`, `.jpeg`, `.png`, `.webp`

### Quiero migrar solo algunas series

Edita el script `scripts/migrate-from-komga.js` y agrega un filtro:

```javascript
// Línea ~125
for (const serie of series) {
  // Agregar filtro
  if (!serie.name.includes('One Piece')) {
    continue; // Saltar esta serie
  }
  // ... resto del código
}
```

## 🔄 Re-migración

Si necesitas volver a migrar:

1. **Limpiar datos anteriores** (opcional):
   ```bash
   sudo docker exec -it manga_app npx prisma studio
   # Eliminar mangas importados manualmente
   ```

2. **Ejecutar migración nuevamente**:
   ```bash
   sudo docker exec -it manga_app npm run migrate:komga
   ```

## 📝 Después de la Migración

**Recomendaciones:**

1. ✅ Revisar mangas importados
2. ✅ Agregar calificaciones manualmente
3. ✅ Agregar comentarios personales
4. ✅ Agregar enlaces de lectura
5. ✅ Corregir tipos (manga, manhwa, manhua, etc.)
6. ✅ Actualizar portadas si es necesario

---

**¿Preguntas o problemas?** Consulta el README.md principal o revisa los logs del contenedor.
