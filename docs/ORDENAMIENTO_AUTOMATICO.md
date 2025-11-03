# 🔢 ORDENAMIENTO AUTOMÁTICO DE CAPÍTULOS

## ✅ Respuesta Directa

**SÍ**, el sistema ordena automáticamente los capítulos sin importar el orden en que los subas.

## 📊 Cómo Funciona

### Lógica de Ordenamiento

El sistema usa la siguiente prioridad en `database.js`:

```sql
ORDER BY 
  COALESCE(chapter_start, chapter_number, 9999) ASC,  -- 1. Por capítulo inicial
  COALESCE(chapter_end, chapter_start, chapter_number, 9999) ASC,  -- 2. Por capítulo final
  COALESCE(volume_number, 9999) ASC,  -- 3. Por volumen
  id ASC  -- 4. Por ID (orden de subida como último recurso)
```

### Ejemplos de Ordenamiento

#### Ejemplo 1: Capítulos Individuales
```
Subes en este orden:  Cap 5 → Cap 2 → Cap 1 → Cap 3
Sistema los ordena:   Cap 1 → Cap 2 → Cap 3 → Cap 5  ✅
```

#### Ejemplo 2: Capítulos con Rangos
```
Subes:   Cap 15-20 → Cap 1-5 → Cap 6-10
Ordena:  Cap 1-5 → Cap 6-10 → Cap 15-20  ✅
```

#### Ejemplo 3: Mezcla de Capítulos y Volúmenes
```
Subes:   Vol 2 → Cap 15 → Cap 5 → Vol 1
Ordena:  Cap 5 → Cap 15 → Vol 1 → Vol 2  ✅
```

## 🧪 Probar el Ordenamiento

### Opción 1: Script Automático
```bash
./scripts/test_chapter_ordering.sh
```

Este script:
1. Crea PDFs: "Cap 5", "Cap 2", "Cap 1", "Cap 3"
2. Los sube en DESORDEN
3. Verifica que se ordenen correctamente: 1 → 2 → 3 → 5

### Opción 2: Prueba Manual

1. **Sube capítulos en desorden:**
   ```bash
   curl -X POST http://localhost:3000/api/upload -F "pdf=@Cap5.pdf"
   # Espera 7 segundos (rate limiting)
   curl -X POST http://localhost:3000/api/upload -F "pdf=@Cap2.pdf"
   # Espera 7 segundos
   curl -X POST http://localhost:3000/api/upload -F "pdf=@Cap1.pdf"
   ```

2. **Consulta los volúmenes:**
   ```bash
   curl http://localhost:3000/api/series/1/volumes
   ```

3. **Verifica el orden:**
   Los volúmenes aparecerán ordenados: Cap 1, Cap 2, Cap 5

## 📱 En la Interfaz Web

El ordenamiento también aplica en:

### Biblioteca (`/`)
Las series muestran sus capítulos ordenados automáticamente:
```
📚 My Manga
   📖 Capítulo 1
   📖 Capítulo 2
   📖 Capítulo 3
   📖 Capítulo 5
```

### Lector (`/reader/:id`)
El botón "Siguiente Capítulo" usa el orden correcto, no el orden de subida.

## 🔍 Detalles Técnicos

### Query de Base de Datos

```javascript
// En database.js
async getVolumesBySeries(series_id) {
  return await this._all(
    `SELECT * FROM volumes WHERE series_id = ? 
     ORDER BY 
       COALESCE(chapter_start, chapter_number, 9999) ASC,
       COALESCE(chapter_end, chapter_start, chapter_number, 9999) ASC,
       COALESCE(volume_number, 9999) ASC,
       id ASC`,
    [series_id]
  );
}
```

### Función COALESCE

`COALESCE(a, b, c)` devuelve el primer valor no-null:
- Si existe `chapter_start`, lo usa
- Si no, intenta `chapter_number`
- Si ninguno existe, usa `9999` (al final)

### Ordenamiento Multi-nivel

1. **Primer nivel:** Capítulo inicial (`chapter_start`)
2. **Segundo nivel:** Capítulo final (`chapter_end`)
3. **Tercer nivel:** Número de volumen
4. **Cuarto nivel:** ID (orden de inserción)

## 💡 Casos Especiales

### Caso 1: Archivos Sin Número
```
"Random Manga.pdf" → Sin chapter_number
→ Aparece al FINAL (COALESCE devuelve 9999)
```

### Caso 2: Capítulos Duplicados
```
Subes: Cap 2 (ID 1)
Subes: Cap 2 (ID 2)
→ Ambos con chapter_start=2
→ Se ordenan por ID: primero ID 1, luego ID 2
```

### Caso 3: Rangos Solapados
```
Subes: Cap 1-10
Subes: Cap 5-15
→ Orden: Cap 1-10 primero (chapter_start=1)
         Cap 5-15 después (chapter_start=5)
```

## 🎯 Ventajas del Sistema

✅ **No importa el orden de subida**
- Sube Cap 5 primero, Cap 1 después → se ordena automáticamente

✅ **Múltiples formatos soportados**
- Capítulos individuales: "Cap 1", "Cap 2"
- Rangos: "Cap 1-5", "Cap 6-10"
- Volúmenes: "Vol 1", "Vol 2"

✅ **Orden consistente en toda la app**
- Biblioteca
- Lector
- API
- Todos usan el mismo ordenamiento

✅ **Sin intervención manual**
- No necesitas renumerar
- No necesitas reordenar
- El sistema lo hace automáticamente

## 🚀 En Resumen

**Pregunta:** ¿Qué pasa si subo primero Cap 2 y después Cap 1?

**Respuesta:** 
```
📤 Subes:    Cap 2 → Cap 1
📚 Sistema:  Cap 1 → Cap 2  ✅ (ordenado automáticamente)
```

El orden de subida **NO afecta** el orden de lectura. El sistema **siempre** muestra los capítulos en el orden lógico correcto.

---

## 🧪 Ejecutar Prueba

```bash
# Prueba completa de ordenamiento
./scripts/test_chapter_ordering.sh

# Resultado esperado:
# Subes:   Cap 5 → Cap 2 → Cap 1 → Cap 3
# Sistema: Cap 1 → Cap 2 → Cap 3 → Cap 5  ✅
```
