# 📝 Prompts de Gemini AI - Sistema de Gestión de Manga

Este archivo contiene los prompts utilizados en el sistema para analizar archivos PDF de manga/yaoi con Gemini AI.

---

## 🎯 PROMPT 1: Matching de Series Existentes

**Ubicación:** `server/services/gemini-service-rotation.js` - línea 212-290  
**Función:** `analyzeAndMatchSeries(filename, existingSeries)`  
**Propósito:** Determinar si un archivo nuevo pertenece a una serie que ya existe en la base de datos

### Prompt Actual (MEJORADO):

```
Analiza si el archivo pertenece a una SERIE EXISTENTE. NO inventes ni traduzcas títulos.

ARCHIVO NUEVO: "${filename}"

SERIES EXISTENTES (título_canónico [CÓDIGO], alias1|alias2…):
${seriesList}

REGLAS OBLIGATORIAS (aplican en este orden):
1) NUNCA cambies el título si la serie ya tiene título_canónico BLOQUEADO. Solo corrige UTF-8 o espacios.
2) NO traduzcas ni "mejores" títulos (p. ej. "La novia del titán" ≠ "El dulce dolor"). Si un alias coincide, asigna la serie, pero mantén el título_canónico.
3) Normaliza antes de comparar: NFKC, minúsculas, sin tildes, sin signos, sin separadores raros, colapsa espacios, corrige UTF-8 (Ã±→ñ, etc.).
4) Coincidencia por tokens: usa intersección de tokens del título vs. título_canónico y alias. Score = ponderación de Jaro-Winkler + Token Sort Ratio. Acepta si score ≥ 0.90 o (score ≥ 0.85 y autor/romanización coincide).
5) Sufijos/etiquetas configurables: si la base marca "Superstar, Another Story, Side-B, Extra" como **arco** de la MISMA serie, trátalo como MISMA serie (no nueva). Si está marcado como "spin-off", trátalo como serie distinta.
6) Si hay números de rango o capítulo, ignóralos para el matching.
7) Si no hay coincidencia con score suficiente, responde que NO coincide.

Salida JSON ÚNICA:
{
  "matches_existing": true|false,
  "matched_series_code": "XXXX" | null,
  "matched_series_title": "título_canónico" | null,
  "alias_matched": "alias_usado_o_null",
  "confidence": "high|medium|low",
  "reason": "explicación breve (incluye score y regla aplicada)",
  "file_analysis": {
    "title_observed": "título visto en el archivo (limpio solo UTF-8)",
    "title_suggested": "igual al canónico si serie bloqueada; si no, vacío",
    "clean_filename": "titulo-canonico-cap-X[-Y].pdf",
    "volume": n|null,
    "chapter": n|null,
    "chapter_start": n|null,
    "chapter_end": n|null,
    "genre": "yaoi|manga|manhwa|manhua"
  }
}

Responde ÚNICAMENTE con el objeto JSON, sin texto adicional.
```

### Variables dinámicas:
- `${filename}`: Nombre del archivo que se está analizando
- `${seriesList}`: Lista de series existentes en formato: `"Título" [CÓDIGO]`

---

## 🎯 PROMPT 2: Análisis Completo de Archivo

**Ubicación:** `server/services/gemini-service-rotation.js` - línea 338-430  
**Función:** `analyzePDFFilename(filename, isNewSeries)`  
**Propósito:** Extraer toda la información del archivo (título, capítulos, metadata completa)

### Prompt Actual (MEJORADO - SIN INVENTAR METADATOS):

```
Analiza el NOMBRE DEL ARCHIVO. No inventes metadatos. No traduzcas. No cambies títulos salvo reparar UTF-8.

Archivo: "${filename}"

Limpia UTF-8 (ej.: Â¡→¡, Ã³→ó), aplica normalización NFKC y extrae SOLO lo que el nombre permita: título sin números, capítulo único o rango, volumen si existe.

Reglas:
- "series_code" debe ser determinístico: usa el hash SHA-1 de "slug del título_canónico" y devuelve los 4 primeros dígitos hex (no generes un código nuevo si ya existe).
- Si el nombre incluye sufijos como "Superstar", "Another Story", etc., NO los borres: devuélvelos en "subtitle" y aplica política de la BD: si la serie está marcada "arco_mismo_titulo": true, NO cambies el título_canónico; si no hay política, deja "subtitle" y no propongas renombrar.
- "clean_filename" solo puede usar el título_canónico existente; si no existe aún, usa el título observado LIMPIO sin traducciones.
- NO rellenes autor/año/editorial a menos que el NOMBRE lo contenga explícitamente. Si no, deja null.

Responde SOLO este JSON:
{
  "file_analysis": {
    "title_observed": "título limpio del nombre (sin nºs)",
    "subtitle": "superstar|another story|extra|null",
    "clean_filename": "slug-titulo-canónico-cap-X[-Y].pdf",
    "series_code": "XXXX",
    "volume": n|null,
    "chapter": n|null,
    "chapter_start": n|null,
    "chapter_end": n|null,
    "genre": "yaoi|manga|manhwa|manhua",
    "is_series": true|false
  },
  "series_metadata": {
    "official_title": null,
    "author": null,
    "year": null,
    "description": null,
    "publisher": null,
    "tags": [],
    "is_yaoi": null
  }
}

Responde ÚNICAMENTE con el objeto JSON, sin texto adicional.
```

### Variables dinámicas:
- `${filename}`: Nombre del archivo a analizar

---

## 🔧 Configuración del Modelo

```javascript
model: 'gemini-2.0-flash'
generationConfig: {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048
}
```

---

## 📊 Flujo de Uso

1. **Subida de archivo** → `filename` recibido
2. **Verificación local** → Se buscan candidatos en BD (similitud >= 95%)
3. **Si hay candidatos** → Usa PROMPT 1 (Matching)
4. **Si no hay candidatos** → Usa PROMPT 2 (Análisis completo)
5. **Resultado** → Serie asignada o nueva serie creada

---

## 💡 Mejoras Sugeridas

### Áreas de mejora:

1. **Detección de idiomas**: Agregar identificación del idioma del título
2. **Géneros más específicos**: Ampliar categorías (shounen, seinen, josei, shoujo)
3. **Alternativas de título**: Incluir títulos alternativos conocidos
4. **Demografía**: Añadir campo de demografía objetivo
5. **Estado de publicación**: Detectar si está en curso o completado
6. **Capítulos totales**: Estimar número total de capítulos si es conocido

### Problemas conocidos:

- **Códigos UTF-8**: A veces fallan en nombres muy corruptos
- **Secuelas**: Necesita más contexto para distinguir mejor
- **Nombres en japonés/coreano**: Podría mejorar la romanización

---

## 📝 Notas de Implementación

- **Rate limiting**: 6.5 segundos entre peticiones (9/minuto por key)
- **Cooldown**: 90 segundos por key después de error
- **Rotación**: Automática entre 10 API keys
- **Reintentos**: Hasta 3 intentos con rotación de keys
- **Fallback**: Análisis básico regex si todas las keys fallan

---

## 🎯 Ejemplos de Entrada/Salida

### Ejemplo 1: Capítulo individual
**Input:** `"24｜¡El Amor Es Una Ilusión! - Superstar⇴αιε.pdf"`

**Output esperado:**
```json
{
  "file_analysis": {
    "title": "El Amor Es Una Ilusión! Superstar",
    "clean_filename": "el-amor-es-una-ilusion-superstar-cap-24.pdf",
    "series_code": "2031",
    "chapter": 24,
    "genre": "yaoi"
  },
  "series_metadata": {
    "official_title": "El Amor Es Una Ilusión! Superstar",
    "author": "Hwacha",
    "year": 2021,
    "is_yaoi": true
  }
}
```

### Ejemplo 2: Rango de capítulos
**Input:** `"El Amor Es Una Ilusión Superstar 15-22.pdf"`

**Output esperado:**
```json
{
  "file_analysis": {
    "title": "El Amor Es Una Ilusión! Superstar",
    "clean_filename": "el-amor-es-una-ilusion-superstar-cap-15-22.pdf",
    "series_code": "2031",
    "chapter_start": 15,
    "chapter_end": 22,
    "genre": "yaoi"
  }
}
```

---

## 🚀 Para Mejorar los Prompts

1. Copia los prompts de arriba
2. Métalos a ChatGPT/Claude/otra IA
3. Pide mejoras específicas:
   - "Mejora la detección de secuelas vs misma serie"
   - "Añade soporte para detectar [IDIOMA] en el título"
   - "Mejora la limpieza de caracteres UTF-8 corruptos"
4. Prueba los nuevos prompts
5. Reemplaza en el archivo `gemini-service-rotation.js`

---

## 🔥 MEJORAS CRÍTICAS PENDIENTES DE IMPLEMENTAR

### 1. Normalización Hardcore (antes del LLM)

```javascript
function normalizeTitle(title) {
  return title
    .normalize('NFKC')                    // Unifica caracteres Unicode
    .toLowerCase()                        // Minúsculas
    .replace(/[àáâãäå]/g, 'a')           // Quitar tildes
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^\w\s]/g, ' ')            // Remover puntuación
    .replace(/\s+/g, ' ')                 // Colapsar espacios
    .trim();
}
```

### 2. Score Híbrido de Matching

```javascript
const natural = require('natural');
const jaro = natural.JaroWinklerDistance;

function calculateMatchScore(title1, title2) {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);
  
  // Jaro-Winkler: mejor para nombres similares
  const jaroScore = jaro(norm1, norm2);
  
  // Token Sort Ratio: ignora orden de palabras
  const tokens1 = norm1.split(' ').sort().join(' ');
  const tokens2 = norm2.split(' ').sort().join(' ');
  const tokenScore = jaro(tokens1, tokens2);
  
  // Promedio ponderado
  return 0.5 * jaroScore + 0.5 * tokenScore;
}

// Uso:
// score >= 0.90 → match automático
// score >= 0.85 && (alias || author match) → match con verificación
// score < 0.85 → no match
```

### 3. Series Code Determinista

```javascript
const crypto = require('crypto');

function generateSeriesCode(titleCanonical) {
  const slug = titleCanonical
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
    
  const hash = crypto.createHash('sha1')
    .update(slug)
    .digest('hex');
    
  return hash.substring(0, 4).toUpperCase();
}

// Ejemplo:
// "El Amor Es Una Ilusión" → "el-amor-es-una-ilusion" → SHA1 → "A3F2"
// Siempre el mismo código para el mismo título
```

### 4. Tabla de Políticas por Serie (Nueva tabla en BD)

```sql
CREATE TABLE series_policies (
  series_id INTEGER PRIMARY KEY,
  title_canonical TEXT NOT NULL,
  title_locked BOOLEAN DEFAULT FALSE,
  do_not_translate BOOLEAN DEFAULT FALSE,
  aliases TEXT, -- JSON array: ["alias1", "alias2"]
  treat_as_arc TEXT, -- JSON array: ["superstar", "extra"]
  treat_as_spinoff TEXT, -- JSON array: ["another story", "side-b"]
  romanizations TEXT, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (series_id) REFERENCES series(id)
);
```

### 5. Tabla de Auditoría de Matching

```sql
CREATE TABLE matching_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  series_id INTEGER,
  matched BOOLEAN,
  score REAL,
  method TEXT, -- 'llm' | 'local' | 'manual'
  alias_used TEXT,
  subtitle_detected TEXT,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (series_id) REFERENCES series(id)
);
```

### 6. Whitelist de Subtítulos Configurables

```javascript
const SUBTITLE_POLICIES = {
  // Tratar como ARCO (misma serie)
  arcs: ['superstar', 'extra', 'special', 'omake', 'side story'],
  
  // Tratar como SPIN-OFF (serie diferente)
  spinoffs: ['another story', 'side-b', 'alternative', 'remake'],
  
  // Secuelas numeradas (serie diferente)
  sequels: /\b(2|ii|two|season 2|part 2)\b/i
};

function classifySubtitle(subtitle) {
  const norm = subtitle.toLowerCase();
  
  if (SUBTITLE_POLICIES.arcs.some(arc => norm.includes(arc))) {
    return 'arc'; // Misma serie
  }
  
  if (SUBTITLE_POLICIES.spinoffs.some(spin => norm.includes(spin))) {
    return 'spinoff'; // Serie diferente
  }
  
  if (SUBTITLE_POLICIES.sequels.test(subtitle)) {
    return 'sequel'; // Serie diferente
  }
  
  return 'unknown'; // Requiere revisión manual
}
```

### 7. Fallback Sin LLM (cuando score es alto)

```javascript
async function quickMatch(filename, allSeries) {
  const cleaned = cleanFilename(filename);
  const titleObserved = extractTitle(cleaned);
  
  for (const series of allSeries) {
    // Verificar contra título canónico
    const score = calculateMatchScore(titleObserved, series.title);
    
    if (score >= 0.90) {
      return {
        matched: true,
        series_id: series.id,
        score,
        method: 'local_high_confidence'
      };
    }
    
    // Verificar contra alias si hay
    const policies = await getSeriesPolicies(series.id);
    for (const alias of policies.aliases || []) {
      const aliasScore = calculateMatchScore(titleObserved, alias);
      if (aliasScore >= 0.90) {
        return {
          matched: true,
          series_id: series.id,
          score: aliasScore,
          alias_used: alias,
          method: 'local_alias_match'
        };
      }
    }
  }
  
  return null; // Necesita LLM
}
```

### 8. Corrección de UTF-8 Mejorada

```javascript
function fixUTF8Encoding(str) {
  const fixes = {
    'Ã³': 'ó', 'Ã±': 'ñ', 'Ã©': 'é', 'Ã¡': 'á',
    'Ã­': 'í', 'Ãº': 'ú', 'Â¡': '¡', 'Â¿': '¿',
    'Ã': 'Ñ', 'Ã'': 'Ó', 'Ã‰': 'É', 'Ã': 'Á',
    'Ãš': 'Ú', 'Ã': 'Í', 'ï½¡': '|', 'â‡´': '',
    'Î±Î¹Îµ': '', 'â´': '', '｜': '-'
  };
  
  let fixed = str;
  for (const [bad, good] of Object.entries(fixes)) {
    fixed = fixed.replace(new RegExp(bad, 'g'), good);
  }
  
  return fixed.normalize('NFKC');
}
```

### 9. Casos de Prueba Críticos

```javascript
const TEST_CASES = [
  {
    input: '23 | ¡El Amor Es Una Ilusión! - Superstar⇴αιε.pdf',
    expected: {
      series: 'El Amor Es Una Ilusión',
      chapter: 23,
      subtitle: 'superstar',
      same_series: true // si 'superstar' está en arcs
    }
  },
  {
    input: 'El Amor Es Una Ilusión Superstar 15-22.pdf',
    expected: {
      series: 'El Amor Es Una Ilusión',
      chapter_start: 15,
      chapter_end: 22,
      subtitle: 'superstar',
      same_series: true
    }
  },
  {
    input: 'La novia del titán 12.pdf',
    expected: {
      series: 'La novia del titán',
      chapter: 12,
      NEVER_RENAME_TO: 'El dulce dolor'
    }
  },
  {
    input: 'Love Stage!! 03.pdf',
    expected: {
      series: 'Love Stage',
      chapter: 3,
      matches_with: 'Love Stage 3.pdf'
    }
  },
  {
    input: '24Â¡El Amor Es Una Ilusin!.pdf',
    expected: {
      series: 'El Amor Es Una Ilusión',
      chapter: 24,
      utf8_fixed: true
    }
  }
];
```

---

## 📋 TODO List de Implementación

### Prioridad Alta (hacer primero)
- [ ] Implementar `normalizeTitle()` con NFKC
- [ ] Implementar `calculateMatchScore()` híbrido
- [ ] Implementar `generateSeriesCode()` determinista
- [ ] Agregar tabla `series_policies` a la BD
- [ ] Agregar tabla `matching_logs` a la BD
- [ ] Implementar corrección UTF-8 mejorada

### Prioridad Media
- [ ] Implementar `quickMatch()` fallback sin LLM
- [ ] Agregar UI para "Fijar título canónico"
- [ ] Agregar UI para gestionar alias
- [ ] Implementar whitelist de subtítulos (arcs vs spinoffs)
- [ ] Actualizar prompts de Gemini con las versiones mejoradas

### Prioridad Baja
- [ ] Agregar tests unitarios con casos de prueba
- [ ] Agregar página de auditoría de matching
- [ ] Detectar romanización automática
- [ ] Migrar series existentes a nuevo sistema

---

**Archivo generado:** 2 de noviembre de 2025  
**Sistema:** MangaRead v2.0  
**Ubicación código:** `/opt/MangaRead/server/services/gemini-service-rotation.js`  
**Versión:** 2.1 (Con mejoras anti-fragmentación)
