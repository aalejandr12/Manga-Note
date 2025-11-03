# 📝 EJEMPLOS DE NOMBRES DE ARCHIVO

Este documento muestra ejemplos de cómo nombrar tus PDFs para obtener los mejores resultados con la organización automática.

## ✅ Formatos Recomendados

### Mangas con Volúmenes

```
Killing Stalking Vol 1.pdf
Killing Stalking Vol 2.pdf
Killing Stalking - Volumen 03.pdf

Ten Count Tomo 1.pdf
Ten Count Tomo 02.pdf

Given Volume 1.pdf
Given Volume 2.pdf
```

### Mangas con Capítulos

```
Junjou Romantica Capitulo 1.pdf
Junjou Romantica Cap 2.pdf
Junjou Romantica - Chapter 15.pdf

Sekaiichi Hatsukoi Cap 01.pdf
Sekaiichi Hatsukoi Capitulo 02.pdf
```

### Mangas Completos (Un solo archivo)

```
Love Stage.pdf
Doukyuusei.pdf
Hitorijime My Hero.pdf
Yuri on Ice.pdf
```

### Con Información Adicional

```
Sasaki to Miyano Vol 1 [Yaoi].pdf
Cherry Blossoms After Winter Tomo 3 (Manhwa).pdf
19 Days - Capitulo 145 [Old Xian].pdf
```

## 🎯 Lo que la IA Detectará

La IA de Gemini analizará y extraerá:

1. **Título del manga**: "Killing Stalking", "Ten Count", etc.
2. **Número de volumen**: 1, 2, 3, etc.
3. **Número de capítulo**: 1, 15, 145, etc.
4. **Género**: yaoi, manga, manhwa, manhua
5. **Si es serie**: Determina si tiene múltiples partes

## 🔍 Ejemplos de Detección

### Ejemplo 1: Serie con Volúmenes
```
Nombre: "Given Vol 1.pdf"

Detectará:
- Título: "Given"
- Volumen: 1
- Género: yaoi
- Es Serie: true

Resultado: Se creará la serie "Given" y se agregará el Vol 1
```

### Ejemplo 2: Capítulos
```
Nombre: "19 Days - Capitulo 145.pdf"

Detectará:
- Título: "19 Days"
- Capítulo: 145
- Género: manga
- Es Serie: true

Resultado: Se agregará a la serie "19 Days" como Cap 145
```

### Ejemplo 3: Manga Completo
```
Nombre: "Doukyuusei.pdf"

Detectará:
- Título: "Doukyuusei"
- Volumen: null
- Capítulo: null
- Género: yaoi
- Es Serie: false

Resultado: Se creará como manga individual
```

## ❌ Nombres NO Recomendados

Evita estos formatos:

```
✗ manga_001.pdf                    (No hay información del título)
✗ Download (1).pdf                 (Sin información útil)
✗ IMG_20240101_123456.pdf         (Parece imagen, no PDF)
✗ @#$%^&*().pdf                   (Caracteres especiales en exceso)
✗ NewDocument.pdf                  (Genérico)
```

## 🌟 Tips para Mejores Resultados

1. **Usa el título completo o abreviado** del manga
2. **Especifica "Vol", "Volumen", "Tomo", "Cap", "Capitulo", o "Chapter"**
3. **Números claros**: Vol 1, Vol 01, Volumen 001 (todos funcionan)
4. **Evita caracteres especiales** innecesarios
5. **Mantén consistencia** en toda la serie

## 📚 Mangas Yaoi/BL Populares

Ejemplos de títulos que funcionan bien:

```
# Clásicos
Junjou Romantica Vol 1.pdf
Sekaiichi Hatsukoi Tomo 2.pdf
Love Stage Vol 1.pdf
Ten Count Vol 3.pdf

# Manhwa (Coreano)
Killing Stalking Vol 1.pdf
Cherry Blossoms After Winter Tomo 1.pdf
BJ Alex Capitulo 1.pdf
Semantic Error Vol 1.pdf

# Manhua (Chino)
19 Days - Capitulo 100.pdf
Heaven Official's Blessing Vol 1.pdf
Mo Dao Zu Shi Tomo 1.pdf

# Contemporáneos
Given Vol 1.pdf
Sasaki to Miyano Tomo 1.pdf
Hitorijime My Hero Vol 1.pdf
Doukyuusei.pdf
```

## 🔄 Reorganización Automática

Cuando subes archivos con nombres similares:

```
Given Vol 1.pdf  ─┐
Given Vol 2.pdf  ─┼─► Se agrupan automáticamente en "Given"
Given Vol 3.pdf  ─┘
```

La IA detectará que pertenecen a la misma serie y los organizará juntos.

## 💡 Modo Sin IA (Fallback)

Si no configuras la API de Gemini, el sistema usa análisis básico:

- Busca patrones como "Vol", "Cap", "Tomo"
- Extrae números
- Limpia el título

**Menos preciso pero funcional** para nombres bien estructurados.

---

Con estos ejemplos, tu biblioteca quedará perfectamente organizada! 📖✨
