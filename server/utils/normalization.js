const crypto = require('crypto');
const natural = require('natural');

/**
 * Normalización mejorada que retorna dos versiones:
 * - observed: con tildes y signos correctos (para UI)
 * - comparable: sin tildes ni signos (para matching)
 */
function normalizeTitle(title) {
  if (!title) return { observed: '', comparable: '' };
  
  // Aplicar corrección UTF-8 primero
  let t = fixUTF8Encoding(title);
  t = t.normalize('NFKC');
  
  // El "observado" (para UI) respeta tildes y signos correctos
  const observed = t.replace(/\s+/g, ' ').trim();
  
  // El "comparable" (para score) sin tildes ni signos
  const comparable = observed
    .toLowerCase()
    .normalize('NFKD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{Letter}\p{Number} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return { observed, comparable };
}

/**
 * Versión legacy que retorna solo el comparable (para compatibilidad)
 */
function normalizeTitleLegacy(title) {
  const { comparable } = normalizeTitle(title);
  return comparable;
}

/**
 * Token Set Ratio: calcula intersección/unión de palabras
 */
function tokenSetRatio(a, b) {
  const A = new Set(a.split(' ').filter(w => w.length > 0));
  const B = new Set(b.split(' ').filter(w => w.length > 0));
  
  const intersection = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  
  return union > 0 ? intersection / union : 0;
}

/**
 * Score híbrido: 60% Jaro-Winkler + 40% Token Set Ratio
 * Jaro-Winkler es mejor para similitud de cadenas
 * Token Set Ratio ignora orden y repeticiones
 * @returns {number} Score entre 0 y 1
 */
function calculateMatchScore(title1, title2) {
  if (!title1 || !title2) return 0;
  
  const { comparable: comp1 } = normalizeTitle(title1);
  const { comparable: comp2 } = normalizeTitle(title2);
  
  if (comp1 === comp2) return 1.0;
  
  // Jaro-Winkler: mejor para nombres similares
  const jaroScore = natural.JaroWinklerDistance(comp1, comp2);
  
  // Token Set Ratio: intersección/unión de palabras
  const tokenScore = tokenSetRatio(comp1, comp2);
  
  // Promedio ponderado: 60% jaro + 40% tokens
  return 0.6 * jaroScore + 0.4 * tokenScore;
}

/**
 * Crea slug sin tildes ni signos (para hashing consistente)
 */
function slug(s) {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\p{Diacritic}/gu, '')  // Quitar tildes
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Genera código de serie determinista usando SHA-1 del slug
 * Siempre devuelve el mismo código para el mismo título canónico
 * Ejemplo: "¡El Amor Es Una Ilusión!" → "el-amor-es-una-ilusion" → SHA1 → primeros 4 hex
 */
function generateSeriesCode(titleCanonical) {
  if (!titleCanonical) {
    throw new Error('titleCanonical es requerido');
  }
  
  const titleSlug = slug(titleCanonical);
  const hash = crypto.createHash('sha1')
    .update(titleSlug, 'utf8')
    .digest('hex');
    
  return hash.substring(0, 4).toUpperCase();
}

/**
 * Corrección de UTF-8 corrupto común en nombres de archivos
 */
function fixUTF8Encoding(str) {
  if (!str) return '';
  
  const fixes = {
    'Ã³': 'ó', 'Ã±': 'ñ', 'Ã©': 'é', 'Ã¡': 'á',
    'Ã­': 'í', 'Ãº': 'ú', 'Â¡': '¡', 'Â¿': '¿',
    'ÃÑ': 'Ñ', 'ÃÓ': 'Ó', 'ÃÉ': 'É', 'ÃÁ': 'Á',
    'Ãš': 'Ú', 'ÃÍ': 'Í', 'ï½¡': '|', 'â‡´': '',
    'Î±Î¹Îµ': '', 'â´': '', '｜': '-', '⇴': '',
    'αιε': '', 'Â ': ' ', 'Â': ''
  };
  
  let fixed = str;
  for (const [bad, good] of Object.entries(fixes)) {
    fixed = fixed.split(bad).join(good);
  }
  
  return fixed.normalize('NFKC');
}

/**
 * Políticas de subtítulos configurables
 */
const SUBTITLE_POLICIES = {
  // Tratar como ARCO (misma serie)
  arcs: ['superstar', 'extra', 'special', 'omake', 'side story', 'gaiden'],
  
  // Tratar como SPIN-OFF (serie diferente)
  spinoffs: ['another story', 'side-b', 'alternative', 'remake', 'parallel'],
  
  // Secuelas numeradas (serie diferente)
  sequels: /\b(2|ii|two|season 2|part 2|parte 2)\b/i
};

/**
 * Clasifica un subtítulo según política
 * @returns {'arc'|'spinoff'|'sequel'|'unknown'}
 */
function classifySubtitle(subtitle) {
  if (!subtitle) return 'unknown';
  
  const norm = subtitle.toLowerCase().trim();
  
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

/**
 * Extrae el título base de un filename eliminando números y extensión
 */
function extractTitleFromFilename(filename) {
  if (!filename) return '';
  
  // Primero corregir UTF-8
  let cleaned = fixUTF8Encoding(filename);
  
  // Remover extensión
  cleaned = cleaned.replace(/\.pdf$/i, '');
  
  // Remover patrones de capítulos/volúmenes comunes
  cleaned = cleaned
    .replace(/\s*[-|｜]\s*cap(itulo)?[.\s]*\d+.*$/i, '')
    .replace(/\s*[-|｜]\s*ch(apter)?[.\s]*\d+.*$/i, '')
    .replace(/\s*[-|｜]\s*vol(umen)?[.\s]*\d+.*$/i, '')
    .replace(/\s+\d+\s*-\s*\d+\s*$/, '') // Rangos: "15-22"
    .replace(/\s+\d+\s*$/, '') // Números al final: "Love Stage 03"
    .replace(/\[[\dA-F]{4}\].*$/i, '') // Códigos de serie existentes
    .replace(/[-|｜⇴αιε]+$/, '') // Separadores al final
    .trim();
  
  return cleaned;
}

/**
 * Calcula similitud entre dos títulos (wrapper simplificado)
 * @returns {number} Score entre 0 y 100
 */
function calculateSimilarity(str1, str2) {
  const score = calculateMatchScore(str1, str2);
  return Math.round(score * 100);
}

/**
 * Parsea información de capítulo/rango/subtítulo del nombre de archivo
 * NO mezcla parsing con matching - es responsabilidad separada
 * @param {string} filename - Nombre completo del archivo
 * @returns {Object} {chapter_start, chapter_end, chapter, subtitle}
 * 
 * Ejemplos:
 * - "23 | ¡El Amor Es Una Ilusión! - Superstar⇴αιε.pdf" → {chapter: 23, subtitle: "superstar"}
 * - "El Amor Es Una Ilusión Superstar 15-22.pdf" → {chapter_start: 15, chapter_end: 22, subtitle: "superstar"}
 */
function parseChapterInfo(filename) {
  if (!filename) return { chapter_start: null, chapter_end: null, chapter: null, subtitle: null };
  
  // Remover extensión
  const base = filename.replace(/\.[^.]+$/, '');
  
  // Buscar rango de capítulos: "15-22", "1-14", "95–156" (con guión o dash)
  const chapterRange = base.match(/\b(\d+)\s*[-–—]\s*(\d+)\b/);
  
  // Buscar capítulo individual: números de 1-4 dígitos
  const chapterSingle = base.match(/\b(\d{1,4})\b/);
  
  // Buscar subtítulos conocidos (palabras clave)
  const subtitleMatch = base.match(/\b(superstar|another\s*story|extra|omake|side[- ]?b|gaiden|back\s*stage)\b/i);
  const subtitle = subtitleMatch ? subtitleMatch[1].toLowerCase().replace(/\s+/g, ' ') : null;
  
  let chapter_start = null;
  let chapter_end = null;
  let chapter = null;
  
  if (chapterRange) {
    // Es un rango
    chapter_start = parseInt(chapterRange[1], 10);
    chapter_end = parseInt(chapterRange[2], 10);
  } else if (chapterSingle) {
    // Es capítulo individual
    chapter = parseInt(chapterSingle[1], 10);
    chapter_start = chapter;
    chapter_end = chapter;
  }
  
  return {
    chapter_start,
    chapter_end,
    chapter,
    subtitle
  };
}

/**
 * Calcula match de un título contra una serie con políticas
 * Verifica contra título canónico y todos los alias
 * @param {string} titleComparable - Título normalizado (comparable)
 * @param {Object} series - Objeto de serie con title_canonical, aliases[], etc.
 * @returns {Object} {score, via} - score 0-1, via indica qué coincidió
 */
function matchAgainstSeries(titleComparable, series) {
  if (!titleComparable || !series) return { score: 0, via: null };
  
  // Preparar lista de candidatos: canónico + alias
  const candidates = [series.title_canonical || series.title];
  
  // Agregar alias si existen (puede ser JSON string o array)
  if (series.aliases) {
    const aliasArray = typeof series.aliases === 'string' 
      ? JSON.parse(series.aliases) 
      : series.aliases;
    
    if (Array.isArray(aliasArray)) {
      candidates.push(...aliasArray);
    }
  }
  
  // Calcular score contra cada candidato
  let best = { score: 0, via: null };
  
  for (const candidate of candidates) {
    const { comparable } = normalizeTitle(candidate);
    const score = calculateMatchScore(titleComparable, comparable);
    
    if (score > best.score) {
      best = { score, via: candidate };
    }
  }
  
  return best;
}

/**
 * Construye nombre de archivo limpio respetando políticas de arcs
 * Si el subtítulo está en subtitles_arc_whitelist, lo preserva con prefijo "-arc-"
 * @param {Object} series - Serie con title_canonical y subtitles_arc_whitelist
 * @param {Object} chapterInfo - Info de parseChapterInfo()
 * @returns {string} Nombre de archivo limpio
 * 
 * Ejemplos:
 * - Si subtitle="superstar" y está en whitelist → "el-amor-es-una-ilusion-arc-superstar-cap-15-22.pdf"
 * - Si no está en whitelist → "el-amor-es-una-ilusion-cap-15-22.pdf"
 */
function buildCleanFilename(series, chapterInfo) {
  if (!series || !chapterInfo) return 'unknown.pdf';
  
  const titleCanonical = series.title_canonical || series.title;
  const baseSlug = slug(titleCanonical);
  
  // Verificar si el subtítulo es un arco permitido
  let arcPart = '';
  if (chapterInfo.subtitle) {
    // Parsear subtitles_arc_whitelist (puede ser JSON string o array)
    let arcWhitelist = [];
    if (series.treat_as_arc) {
      arcWhitelist = typeof series.treat_as_arc === 'string'
        ? JSON.parse(series.treat_as_arc)
        : series.treat_as_arc;
    }
    
    // Si el subtítulo está en la whitelist, preservarlo
    if (Array.isArray(arcWhitelist) && arcWhitelist.includes(chapterInfo.subtitle)) {
      arcPart = `-arc-${chapterInfo.subtitle}`;
    }
  }
  
  // Construir parte del capítulo
  let chapterPart = '';
  if (chapterInfo.chapter_start && chapterInfo.chapter_end && 
      chapterInfo.chapter_start !== chapterInfo.chapter_end) {
    // Es un rango
    chapterPart = `-cap-${chapterInfo.chapter_start}-${chapterInfo.chapter_end}`;
  } else if (chapterInfo.chapter) {
    // Capítulo individual
    chapterPart = `-cap-${chapterInfo.chapter}`;
  } else {
    // Sin capítulo específico
    chapterPart = '-cap-0';
  }
  
  return `${baseSlug}${arcPart}${chapterPart}.pdf`;
}

module.exports = {
  normalizeTitle,
  normalizeTitleLegacy,
  calculateMatchScore,
  generateSeriesCode,
  fixUTF8Encoding,
  classifySubtitle,
  extractTitleFromFilename,
  calculateSimilarity,
  parseChapterInfo,
  matchAgainstSeries,
  buildCleanFilename,
  slug,
  tokenSetRatio,
  SUBTITLE_POLICIES
};
