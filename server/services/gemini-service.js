const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Se requiere una API key de Gemini');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Usar gemini-1.5-flash (más rápido y gratuito) o gemini-1.5-pro (más preciso)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Normaliza un título para búsqueda y comparación
   */
  normalizeTitle(title) {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
      .replace(/[^a-z0-9\s]/g, '') // Solo letras, números y espacios
      .replace(/\s+/g, ' ') // Normaliza espacios
      .trim();
  }

  /**
   * Genera un código único de 4 dígitos basado en el título
   */
  generateSeriesCode(title) {
    // Crear hash simple del título
    let hash = 0;
    const normalized = this.normalizeTitle(title);
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Convertir a número positivo de 4 dígitos
    const code = Math.abs(hash % 10000).toString().padStart(4, '0');
    return code;
  }

  /**
   * Analiza el nombre de archivo de un PDF y extrae información del manga
   */
  async analyzePDFFilename(filename) {
    const prompt = `Analiza este nombre de archivo de manga/yaoi y extrae la información en formato JSON.

Nombre del archivo: "${filename}"

Debes identificar y extraer:
1. title: El título del manga (nombre principal de la serie)
2. series_code: Un código único de 4 dígitos para identificar la serie (ejemplo: "2030", "1500", etc.)
   - Si hay un código en el nombre del archivo, úsalo
   - Si no hay código, genera uno único basado en el título (mismo título = mismo código)
3. volume: El número de volumen (si existe), como número entero
4. chapter: El número de capítulo único (si existe), como número entero
5. chapter_start: El capítulo inicial si es un rango (ej: en "Cap 1-30" sería 1)
6. chapter_end: El capítulo final si es un rango (ej: en "Cap 1-30" sería 30)
7. genre: El género (yaoi, manga, manhwa, manhua, etc.)
8. is_series: true si es parte de una serie con múltiples volúmenes/capítulos

IMPORTANTE: 
- Detecta códigos en formatos: "[2030]", "2030", "(2030)", "#2030"
- Detecta patrones de rangos como:
  - "(1-30)" → chapter_start: 1, chapter_end: 30
  - "Cap 5-15" → chapter_start: 5, chapter_end: 15
  - "Capitulos 1 al 20" → chapter_start: 1, chapter_end: 20
  - "Ch 10-25" → chapter_start: 10, chapter_end: 25

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional:
{
  "title": "nombre del manga",
  "series_code": "código de 4 dígitos",
  "volume": número o null,
  "chapter": número o null,
  "chapter_start": número o null,
  "chapter_end": número o null,
  "genre": "yaoi|manga|manhwa|manhua",
  "is_series": true/false
}

Ejemplos:
- "Killing Stalking Vol 1.pdf" → {"title": "Killing Stalking", "volume": 1, "chapter": null, "chapter_start": null, "chapter_end": null, "genre": "yaoi", "is_series": true}
- "Given (1-30).pdf" → {"title": "Given", "volume": null, "chapter": null, "chapter_start": 1, "chapter_end": 30, "genre": "yaoi", "is_series": true}
- "Ten Count Cap 5-15.pdf" → {"title": "Ten Count", "volume": null, "chapter": null, "chapter_start": 5, "chapter_end": 15, "genre": "yaoi", "is_series": true}
- "Love Stage Capitulo 10.pdf" → {"title": "Love Stage", "volume": null, "chapter": 10, "chapter_start": null, "chapter_end": null, "genre": "yaoi", "is_series": true}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extraer JSON de la respuesta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON de la respuesta');
      }

      const data = JSON.parse(jsonMatch[0]);
      
      // Validar y normalizar datos
      const title = data.title || 'Manga Sin Título';
      let series_code = data.series_code;
      
      // Si no hay código, generar uno basado en el título
      if (!series_code || series_code.length !== 4) {
        series_code = this.generateSeriesCode(title);
      }
      
      return {
        title,
        series_code,
        normalized_title: this.normalizeTitle(title),
        volume: data.volume ? parseInt(data.volume) : null,
        chapter: data.chapter ? parseInt(data.chapter) : null,
        chapter_start: data.chapter_start ? parseInt(data.chapter_start) : null,
        chapter_end: data.chapter_end ? parseInt(data.chapter_end) : null,
        genre: data.genre || 'manga',
        is_series: data.is_series !== false
      };
    } catch (error) {
      console.error('Error al analizar con Gemini:', error);
      
      // Fallback: análisis básico sin IA
      return this.basicFilenameAnalysis(filename);
    }
  }

  /**
   * Análisis básico de nombre de archivo sin IA (fallback)
   */
  basicFilenameAnalysis(filename) {
    // Remover extensión
    let name = filename.replace(/\.pdf$/i, '');
    
    // Remover timestamps de Multer (timestamp-random-nombre.pdf)
    name = name.replace(/^\d{13,}-\d+-/, '');
    
    // Buscar código de serie: [2030], (2030), 2030, #2030 (solo 4 dígitos exactos)
    const codeMatch = name.match(/[\[\(#](\d{4})[\]\)]/);
    let series_code = null;
    if (codeMatch) {
      series_code = codeMatch[1];
      // Remover código del nombre
      name = name.replace(codeMatch[0], '').trim();
    }
    
    // Primero buscar rangos de capítulos: "1-14", "15-22", Cap 1-30, Ch 1-30, etc.
    const rangeMatch = name.match(/(?:^|[\s._-])(\d{1,3})[\s._-]*(?:al|a|-|–|~)[\s._-]*(\d{1,3})(?:[\s._-]|$)/i);
    let chapter_start = null;
    let chapter_end = null;
    let chapter = null;
    
    if (rangeMatch) {
      chapter_start = parseInt(rangeMatch[1]);
      chapter_end = parseInt(rangeMatch[2]);
    } else {
      // Si no hay rango, buscar capítulo individual al inicio (ej: "24¡El Amor...")
      const leadingChapterMatch = name.match(/^(\d{1,3})[\s¡!._-]/);
      if (leadingChapterMatch) {
        const num = parseInt(leadingChapterMatch[1]);
        // Solo considerar como capítulo si es menor a 100
        if (num < 100) {
          chapter = num;
          chapter_start = num;
          chapter_end = num;
        }
      }
    }
    
    // Buscar números de volumen individuales
    const volumeMatch = name.match(/vol(?:umen)?[\s._-]*(\d+)/i);
    const tomoMatch = name.match(/tomo[\s._-]*(\d+)/i);
    
    // Si no hay capítulo al inicio, buscar con prefijo Cap/Ch
    if (!chapter && !chapter_start) {
      const chapterMatch = name.match(/cap(?:itulo)?[\s._-]*(\d+)/i) || name.match(/ch(?:apter)?[\s._-]*(\d+)/i);
      if (chapterMatch) {
        chapter = parseInt(chapterMatch[1]);
        chapter_start = chapter;
        chapter_end = chapter;
      }
    }
    
    const volume = volumeMatch ? parseInt(volumeMatch[1]) : (tomoMatch ? parseInt(tomoMatch[1]) : null);
    
    // Limpiar título - MEJORADO: remover números y marcadores de capítulos
    let title = name
      .replace(/^(\d{1,3})[\s¡!._-]+/i, '') // Remover números al inicio (ej: "24¡El Amor...")
      .replace(/[\s._-]*\d{1,3}[\s._-]*(?:al|a|-|–|~)[\s._-]*\d{1,3}[\s._-]*/gi, ' ') // Rangos
      .replace(/vol(?:umen)?[\s._-]*\d+/gi, '')
      .replace(/cap(?:itulo)?s?[\s._-]*\d+/gi, '')
      .replace(/ch(?:apter)?s?[\s._-]*\d+/gi, '')
      .replace(/tomo[\s._-]*\d+/gi, '')
      .replace(/[\s._-]+/g, ' ')
      .trim();
    
    if (!title) title = 'Manga Sin Título';
    
    // Generar código si no se encontró
    if (!series_code) {
      series_code = this.generateSeriesCode(title);
    }
    
    return {
      title,
      series_code,
      normalized_title: this.normalizeTitle(title),
      volume,
      chapter,
      chapter_start,
      chapter_end,
      genre: 'manga',
      is_series: !!(volume || chapter || chapter_start || chapter_end)
    };
  }

  /**
   * Busca metadata completa de un manga (autor, año, descripción, etc.)
   */
  async getSeriesMetadata(title, genre = 'manga') {
    const prompt = `Busca información sobre este ${genre}:

Título: "${title}"

Proporciona la siguiente información en formato JSON (si no encuentras algún dato, usa null):
{
  "official_title": "título oficial completo",
  "author": "nombre del autor/mangaka",
  "year": año de publicación (número),
  "description": "breve descripción (máximo 200 caracteres)",
  "publisher": "editorial",
  "tags": ["tag1", "tag2", "tag3"],
  "is_yaoi": true/false
}

Responde ÚNICAMENTE con el objeto JSON, sin texto adicional.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON de la respuesta');
      }

      const data = JSON.parse(jsonMatch[0]);
      
      return {
        official_title: data.official_title || title,
        author: data.author || null,
        year: data.year ? parseInt(data.year) : null,
        description: data.description || null,
        publisher: data.publisher || null,
        tags: Array.isArray(data.tags) ? data.tags : [],
        is_yaoi: data.is_yaoi === true
      };
    } catch (error) {
      console.error('Error al obtener metadata:', error);
      return {
        official_title: title,
        author: null,
        year: null,
        description: null,
        publisher: null,
        tags: [],
        is_yaoi: genre.toLowerCase() === 'yaoi'
      };
    }
  }

  /**
   * Genera query de búsqueda optimizada para encontrar portadas
   */
  getCoverSearchQuery(title, author = null) {
    let query = `${title} manga cover`;
    if (author) {
      query = `${title} ${author} manga cover`;
    }
    return encodeURIComponent(query);
  }

  /**
   * Analiza las primeras páginas de un PDF para verificar que sea la serie correcta
   */
  async verifySeriesFromPDFContent(pdfText, expectedTitle, expectedAuthor = null) {
    const prompt = `Analiza este texto extraído de las primeras páginas de un PDF de manga:

"${pdfText.substring(0, 1000)}"

Se espera que sea:
- Título: "${expectedTitle}"
${expectedAuthor ? `- Autor: "${expectedAuthor}"` : ''}

¿El contenido coincide con esta serie? Responde en formato JSON:
{
  "is_match": true/false,
  "confidence": 0.0-1.0,
  "detected_title": "título detectado en el contenido",
  "detected_author": "autor detectado" o null,
  "reason": "explicación breve"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON de la respuesta');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error al verificar serie:', error);
      return {
        is_match: true, // Asumir que sí si hay error
        confidence: 0.5,
        detected_title: expectedTitle,
        detected_author: expectedAuthor,
        reason: 'No se pudo verificar automáticamente'
      };
    }
  }

  /**
   * Sugiere si dos títulos son del mismo manga
   */
  async areSameSeries(title1, title2) {
    const norm1 = this.normalizeTitle(title1);
    const norm2 = this.normalizeTitle(title2);
    
    // Comparación directa
    if (norm1 === norm2) return true;
    
    // Comparación con similitud
    const similarity = this.calculateSimilarity(norm1, norm2);
    if (similarity > 0.85) return true;
    
    // Usar Gemini para casos ambiguos
    if (similarity > 0.6) {
      try {
        const prompt = `¿Estos dos títulos se refieren al mismo manga/yaoi? Responde solo "SI" o "NO".

Título 1: "${title1}"
Título 2: "${title2}"`;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().toUpperCase();
        
        return text.includes('SI') || text.includes('YES');
      } catch (error) {
        console.error('Error en comparación con Gemini:', error);
        return similarity > 0.75;
      }
    }
    
    return false;
  }

  /**
   * Calcula similitud entre dos strings (algoritmo Jaro-Winkler simplificado)
   */
  calculateSimilarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calcula la distancia de Levenshtein entre dos strings
   */
  levenshteinDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }
}

module.exports = GeminiService;
