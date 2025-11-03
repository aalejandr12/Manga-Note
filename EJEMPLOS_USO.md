# 📖 Ejemplos de Uso - Sistema Mejorado

## 🎯 Ejemplos de Nombres de Archivos Detectados

### Rangos de Capítulos
```
✅ "Given (1-30).pdf"
   → Título: Given
   → Capítulos: 1 al 30
   → Género: yaoi

✅ "Killing Stalking Cap 5-15.pdf"
   → Título: Killing Stalking
   → Capítulos: 5 al 15
   → Género: yaoi

✅ "Naruto Capitulos 1 al 50.pdf"
   → Título: Naruto
   → Capítulos: 1 al 50
   → Género: manga

✅ "Ten Count Ch 10-25.pdf"
   → Título: Ten Count
   → Capítulos: 10 al 25
   → Género: yaoi
```

### Volúmenes Individuales
```
✅ "Love Stage Vol 1.pdf"
   → Título: Love Stage
   → Volumen: 1
   → Género: yaoi

✅ "Haikyuu Tomo 03.pdf"
   → Título: Haikyuu
   → Volumen: 3
   → Género: manga
```

### Capítulos Individuales
```
✅ "Given - Capitulo 15.pdf"
   → Título: Given
   → Capítulo: 15
   → Género: yaoi

✅ "One Piece Cap 100.pdf"
   → Título: One Piece
   → Capítulo: 100
   → Género: manga
```

## 🎨 Cómo se Ve en la UI

### Biblioteca Principal

```
┌─────────────────────────────────────────────┐
│  📚 Mi Biblioteca                           │
├─────────────────────────────────────────────┤
│  🔍 Buscar...                               │
│                                             │
│  [Todos] [Yaoi] [Manga] [Leyendo]          │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────┐  ┌──────┐  ┌──────┐             │
│  │ 📚   │  │ 📖   │  │ 📚   │             │
│  │      │  │      │  │      │             │  
│  │Given │  │Love  │  │Kill- │             │
│  └──────┘  │Stage │  │Stalk │             │
│  5 vols    └──────┘  └──────┘             │
│  ●●●○○     Completo  8 vols               │
│                      ●●○○○○○○             │
└─────────────────────────────────────────────┘

Leyenda:
📚 = Serie con múltiples volúmenes (efecto apilado)
📖 = Volumen único
● = Volumen completado
○ = Volumen sin leer
```

### Modal de Serie (Carpeta)

```
┌─────────────────────────────────────────────────┐
│  ╔═══════╗  Given                          [X]  │
│  ║       ║  por Natsuki Kizu                    │
│  ║ GIVEN ║  Romance yaoi entre músicos          │
│  ║       ║  [yaoi] [5 volúmenes]                │
│  ╚═══════╝                                      │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │ 📄 Given - Vol. 1              ✓ [▶]   │   │
│  │    Vol. 1                                │   │
│  │    ████████████░░░░░░░░ 75%             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 📄 Given - Vol. 2              ⏱ [▶]   │   │
│  │    Vol. 2                                │   │
│  │    ████░░░░░░░░░░░░░░░░ 25%             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 📄 Given - Cap. 1-30           ○ [▶]   │   │
│  │    Cap. 1-30                             │   │
│  │                                          │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

Leyenda:
✓ = Completado (verde)
⏱ = Leyendo (morado)
○ = Sin leer (gris)
[▶] = Botón para abrir lector
```

## 🤖 Ejemplos de Metadata Detectada por Gemini

### Serie: Given
```json
{
  "official_title": "Given",
  "author": "Natsuki Kizu",
  "year": 2013,
  "description": "Historia de romance yaoi entre músicos de una banda",
  "publisher": "Shinshokan",
  "tags": ["yaoi", "música", "romance", "drama"],
  "is_yaoi": true
}
```

### Serie: Killing Stalking
```json
{
  "official_title": "Killing Stalking",
  "author": "Koogi",
  "year": 2016,
  "description": "Thriller psicológico sobre obsesión y supervivencia",
  "publisher": "Lezhin Comics",
  "tags": ["yaoi", "thriller", "psicológico", "horror"],
  "is_yaoi": true
}
```

### Serie: Naruto
```json
{
  "official_title": "Naruto",
  "author": "Masashi Kishimoto",
  "year": 1999,
  "description": "Aventuras de un ninja que busca convertirse en Hokage",
  "publisher": "Shueisha",
  "tags": ["shounen", "acción", "aventura", "ninjas"],
  "is_yaoi": false
}
```

## 📊 Flujo de Subida Paso a Paso

### Ejemplo: Subir "Given (1-30).pdf"

```
1. 📤 Usuario selecciona archivo
   ├─ Nombre: "Given (1-30).pdf"
   └─ Tamaño: 85 MB (sin límite ✓)

2. 🤖 Gemini analiza nombre
   ├─ Título: "Given"
   ├─ Capítulos: 1-30
   ├─ Género: yaoi
   └─ Es serie: Sí

3. 🔍 Buscar serie en BD
   └─ No existe → Crear nueva

4. 📚 Obtener metadata
   ├─ Título oficial: "Given"
   ├─ Autor: "Natsuki Kizu"
   ├─ Año: 2013
   ├─ Descripción: "Historia de..."
   └─ Tags: [yaoi, música, romance]

5. 🖼️ Buscar portada
   ├─ Intento 1: Internet (DuckDuckGo)
   │   └─ ✓ Encontrada
   ├─ Descargar imagen
   └─ Guardar: /uploads/covers/a3f9d7c8.jpg

6. 💾 Crear serie
   ├─ ID: 1
   ├─ Título: "Given"
   ├─ Autor: "Natsuki Kizu"
   └─ Portada: /uploads/covers/a3f9d7c8.jpg

7. 📖 Crear volumen
   ├─ ID: 1
   ├─ Serie: 1 (Given)
   ├─ Título: "Given - Cap. 1-30"
   ├─ Capítulo inicio: 1
   ├─ Capítulo fin: 30
   └─ Archivo: /uploads/1730483921-Given (1-30).pdf

8. ✅ Completado
   └─ Respuesta:
       {
         "success": true,
         "series_id": 1,
         "volume_id": 1,
         "series_title": "Given",
         "is_new_series": true
       }
```

## 🎬 Secuencia de Uso Típica

### Caso 1: Usuario sube una serie completa

```
1. 📱 Usuario en /upload
2. 🎯 Arrastra 5 PDFs:
   - Given Vol 1.pdf
   - Given Vol 2.pdf
   - Given Vol 3.pdf
   - Given (1-30).pdf
   - Given (31-60).pdf

3. ⚙️ Sistema procesa:
   Primera vez: Crea serie "Given" + metadata
   Resto: Agrega a serie existente

4. ✅ Resultado:
   Serie "Given" con 5 volúmenes:
   - Vol. 1
   - Vol. 2
   - Vol. 3
   - Cap. 1-30
   - Cap. 31-60

5. 📚 Usuario vuelve a biblioteca
   Ve: Carpeta "Given" (5 vols)

6. 👆 Hace clic en carpeta
   Modal muestra los 5 volúmenes

7. 📖 Hace clic en "Vol. 1"
   Se abre el lector PDF
```

### Caso 2: Usuario busca y lee

```
1. 📱 Usuario en biblioteca
2. 🔍 Busca "killing"
   Filtra: Killing Stalking (8 vols)

3. 👆 Clic en serie
   Modal: Lista de 8 volúmenes
   
4. 📊 Ve progreso:
   Vol. 1: 100% ✓
   Vol. 2: 75% ⏱
   Vol. 3: 0% ○
   ...

5. 📖 Continúa leyendo Vol. 2
   Clic → Se abre en última página vista
```

## 🎨 Personalización de Portadas

### Fuentes de Portadas (en orden de prioridad)

1. **Internet** (preferido)
   - Búsqueda automatizada
   - Imágenes de alta calidad
   - Se guardan localmente

2. **Primera página del PDF** (fallback)
   - Extracción automática
   - Siempre disponible
   - Calidad variable

3. **Placeholder con color único** (último recurso)
   - Color generado del título
   - Iniciales de la serie
   - Consistente y único

### Ejemplo de Portadas Generadas

```
Given       → #7f19e6 (morado)
Naruto      → #ff6b35 (naranja)
One Piece   → #4ecdc4 (turquesa)
Haikyuu     → #f7b731 (amarillo)
```

## 📈 Estadísticas Mostradas

```
┌─────────────────────────────────────┐
│  Mi Biblioteca                      │
│                                     │
│  📚 15 Series    📖 48 Volúmenes   │
│  ✓ 23 Completados  ⏱ 8 Leyendo    │
└─────────────────────────────────────┘
```

## 🔄 Actualización de Metadata

Si subes un volumen a una serie existente sin metadata:

```
Serie existente "Given" (solo título)
  ↓
Subes "Given Vol 5.pdf"
  ↓
Sistema detecta que falta metadata
  ↓
Gemini obtiene autor, año, descripción
  ↓
Actualiza serie con información completa
  ↓
Resultado: Serie completa con toda la info
```

---

**Nota:** Todas estas funciones están activas ahora en tu servidor! 🚀
