const { GoogleGenerativeAI } = require('@google/generative-ai');
const { 
  normalizeTitle, 
  calculateMatchScore, 
  generateSeriesCode, 
  fixUTF8Encoding,
  classifySubtitle,
  extractTitleFromFilename,
  SUBTITLE_POLICIES
} = require('../utils/normalization');

/**
 * Servicio de Gemini con rotación automática de API keys
 * Si una key falla por límite de cuota, automáticamente usa la siguiente
 */
class GeminiServiceWithRotation {
  constructor(apiKeys) {
    // Aceptar un array de API keys o una sola string
    this.apiKeys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
    this.currentKeyIndex = 0;
    this.failedKeys = new Set();
    
    // Control de rate limiting conservador (10 peticiones por minuto por key)
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.minDelayBetweenRequests = 6500; // 6.5 segundos entre peticiones (9 por minuto - seguro)
    this.lastRequestTime = 0;
    
    // Sistema de cooldown por key (90 segundos para estar seguros)
    this.keyCooldowns = new Map();
    this.cooldownDuration = 90000; // 90 segundos (1.5 minutos)
    
    // Intentar inicializar con la primera key disponible
    this._initCurrentKey();
    console.log(`✓ Gemini configurado con ${this.apiKeys.length} API key(s)`);
  }
  
  _initCurrentKey() {
    const apiKey = this.apiKeys[this.currentKeyIndex];
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Usar gemini-2.0-flash (modelo estable según la API)
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });
    console.log(`  → Usando API key #${this.currentKeyIndex + 1} (gemini-2.0-flash)`);
  }
  
  /**
   * Intenta rotar a la siguiente API key
   */
  rotateToNextKey() {
    const currentKey = this.apiKeys[this.currentKeyIndex];
    
    // Marcar key en cooldown
    this.keyCooldowns.set(currentKey, Date.now());
    console.log(`⏸️  API key #${this.currentKeyIndex + 1} en cooldown por 90 segundos`);
    
    // Buscar siguiente key disponible
    let attempts = 0;
    while (attempts < this.apiKeys.length) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      const nextKey = this.apiKeys[this.currentKeyIndex];
      
      // Verificar si está en cooldown
      const cooldownTime = this.keyCooldowns.get(nextKey);
      if (cooldownTime) {
        const timeSinceCooldown = Date.now() - cooldownTime;
        if (timeSinceCooldown < this.cooldownDuration) {
          console.log(`⏸️  API key #${this.currentKeyIndex + 1} todavía en cooldown (${Math.ceil((this.cooldownDuration - timeSinceCooldown) / 1000)}s restantes)`);
          attempts++;
          continue;
        } else {
          // Cooldown expirado, remover
          this.keyCooldowns.delete(nextKey);
        }
      }
      
      // Key disponible
      this._initCurrentKey();
      return true;
    }
    
    // Todas las keys en cooldown, esperar la que expire primero
    const nextAvailable = Math.min(...Array.from(this.keyCooldowns.values()).map(time => {
      const remaining = this.cooldownDuration - (Date.now() - time);
      return remaining > 0 ? remaining : 0;
    }));
    
    if (nextAvailable > 0) {
      console.log(`⏳ Todas las API keys en cooldown. Próxima disponible en ${Math.ceil(nextAvailable / 1000)}s`);
    }
    return false;
  }
  
  /**
   * Ejecuta una operación respetando rate limits
   */
  async executeWithRateLimit(operation) {
    // Calcular cuánto tiempo esperar
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minDelayBetweenRequests) {
      const waitTime = this.minDelayBetweenRequests - timeSinceLastRequest;
      console.log(`⏱️  Esperando ${Math.ceil(waitTime / 1000)}s para respetar rate limit...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
    return await operation();
  }

  /**
   * Ejecuta una operación con reintentos automáticos usando diferentes keys
   */
  async executeWithRetry(operation, maxRetries = 5) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Ejecutar con rate limiting, pasar el modelo actual
        return await this.executeWithRateLimit(() => operation(this.model));
      } catch (error) {
        lastError = error;
        
        // Si es error 429 (quota exceeded), rotar key
        if (error.message?.includes('429') || 
            error.message?.includes('quota') || 
            error.message?.includes('RESOURCE_EXHAUSTED') ||
            error.message?.includes('Resource has been exhausted')) {
          
          console.log(`⚠️  Quota excedida en intento ${attempt + 1}/${maxRetries}`);
          
          // Intentar con la siguiente key
          const rotated = this.rotateToNextKey();
          if (!rotated) {
            // Todas en cooldown, esperar más
            console.log('⏳ Esperando 10 segundos antes de reintentar...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            continue;
          }
          
          continue;
        }
        
        // Si es error 404, marcar key como fallida permanentemente
        if (error.message?.includes('404')) {
          const currentKey = this.apiKeys[this.currentKeyIndex];
          this.failedKeys.add(currentKey);
          console.log(`❌ API key #${this.currentKeyIndex + 1} inválida (404)`);
          
          const rotated = this.rotateToNextKey();
          if (!rotated) {
            throw new Error('Todas las API keys son inválidas');
          }
          
          continue;
        }
        
        // Si es otro tipo de error, lanzarlo
        if (attempt === maxRetries - 1) {
          throw error;
        }
        
        // Pequeña pausa antes de reintentar
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw lastError;
  }

  /**
   * Normaliza un título usando el sistema mejorado con NFKC y sin tildes
   * Para compatibilidad, llama a la función del módulo normalization.js
   * Retorna solo el comparable para mantener retrocompatibilidad
   */
  normalizeTitle(title) {
    const { comparable } = normalizeTitle(title);
    return comparable;
  }

  /**
   * Genera código determinista usando SHA-1 (mismo título = mismo código siempre)
   * Para compatibilidad, llama a la función del módulo normalization.js
   */
  generateSeriesCode(title) {
    return generateSeriesCode(title);
  }

  /**
   * Analiza un archivo Y compara con series existentes usando IA
   * Retorna el código de serie correcto (existente o nuevo)
   */
  async analyzeAndMatchSeries(filename, existingSeries = []) {
    // Si no hay series existentes, hacer análisis simple
    if (existingSeries.length === 0) {
      return await this.analyzePDFFilename(filename, true);
    }

    // Construir lista de series existentes para comparación
    const seriesList = existingSeries.map(s => 
      `"${s.title}" [código: ${s.series_code}]`
    ).join('\n');

    // Aplicar corrección UTF-8 antes de procesar
    const cleanedFilename = fixUTF8Encoding(filename);

    const prompt = `Analiza si el archivo pertenece a una SERIE EXISTENTE. NO inventes ni traduzcas títulos.

ARCHIVO NUEVO: "${cleanedFilename}"

SERIES EXISTENTES (título_canónico [CÓDIGO]):
${seriesList}

REGLAS OBLIGATORIAS (aplican en este orden):
1) NUNCA cambies ni traduzcas títulos. "La novia del titán" NO es "El dulce dolor".
2) Normaliza antes de comparar: NFKC, minúsculas, sin tildes, sin puntuación.
3) Coincidencia por tokens: usa intersección de tokens. Acepta si similitud ≥ 0.90 o (≥ 0.85 y autor coincide).
4) Subtítulos como "Superstar", "Another Story", "Side-B" → Trátalo como SERIE DIFERENTE (a menos que se indique lo contrario).
5) Ignora números de capítulo/volumen para el matching.
6) Si no hay coincidencia clara, responde que NO coincide.

Salida JSON ÚNICA:
{
  "matches_existing": true|false,
  "matched_series_code": "XXXX" | null,
  "matched_series_title": "título_canónico" | null,
  "alias_matched": null,
  "confidence": "high|medium|low",
  "reason": "explicación breve (incluye score si calculaste)",
  "file_analysis": {
    "title_observed": "título visto en el archivo (limpio UTF-8 solamente)",
    "title_suggested": "",
    "clean_filename": "titulo-canonico-cap-X[-Y].pdf",
    "volume": n|null,
    "chapter": n|null,
    "chapter_start": n|null,
    "chapter_end": n|null,
    "genre": "yaoi|manga|manhwa|manhua"
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

Responde ÚNICAMENTE con el objeto JSON, sin texto adicional.`;

    try {
      return await this.executeWithRetry(async (model) => {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No se pudo extraer JSON de la respuesta');
        }

        const data = JSON.parse(jsonMatch[0]);
        
        const fileAnalysis = data.file_analysis;
        const titleObserved = fileAnalysis.title_observed || fileAnalysis.title || 'Manga Sin Título';
        
        // Si coincide con serie existente, usar ese código y título canónico
        let series_code, finalTitle;
        if (data.matches_existing && data.matched_series_code) {
          series_code = data.matched_series_code;
          finalTitle = data.matched_series_title; // Usar título canónico de la serie existente
          console.log(`🤖✅ Gemini detectó coincidencia: "${titleObserved}" -> "${finalTitle}" [${series_code}]`);
          console.log(`   Confianza: ${data.confidence} - ${data.reason}`);
          if (data.alias_matched) {
            console.log(`   Alias usado: "${data.alias_matched}"`);
          }
        } else {
          // Serie nueva, generar código determinista
          finalTitle = titleObserved;
          series_code = this.generateSeriesCode(finalTitle);
          console.log(`🤖🆕 Gemini: Nueva serie detectada -> "${finalTitle}" [${series_code}]`);
          console.log(`   ${data.reason}`);
        }

        const metadata = data.series_metadata || {};

        return {
          title: finalTitle,
          series_code: series_code,
          normalized_title: this.normalizeTitle(finalTitle),
          clean_filename: fileAnalysis.clean_filename,
          volume: fileAnalysis.volume,
          chapter: fileAnalysis.chapter,
          chapter_start: fileAnalysis.chapter_start,
          chapter_end: fileAnalysis.chapter_end,
          genre: fileAnalysis.genre || 'manga',
          subtitle: fileAnalysis.subtitle || null,
          metadata: {
            official_title: metadata.official_title || finalTitle,
            author: metadata.author || null,
            year: metadata.year ? parseInt(metadata.year) : null,
            description: metadata.description || null,
            publisher: metadata.publisher || null,
            tags: Array.isArray(metadata.tags) ? metadata.tags : [],
            is_yaoi: metadata.is_yaoi || false
          }
        };
      });
    } catch (error) {
      console.error('⚠️ Error con Gemini, usando análisis básico:', error.message);
      return this.basicFilenameAnalysis(filename);
    }
  }

  /**
   * Analiza el nombre de archivo de un PDF con Gemini AI Y obtiene metadata completa en UNA SOLA CONSULTA
   * Optimizado para no desperdiciar API calls
   */
  async analyzePDFFilename(filename, isNewSeries = false) {
    // Aplicar corrección UTF-8 antes de procesar
    const cleanedFilename = fixUTF8Encoding(filename);

    const prompt = `Analiza el NOMBRE DEL ARCHIVO. No inventes metadatos. No traduzcas. No cambies títulos salvo reparar UTF-8.

Archivo: "${cleanedFilename}"

Limpia UTF-8 y extrae SOLO lo que el nombre permita: título sin números, capítulo único o rango, volumen si existe.

Reglas:
- "series_code" debe ser determinístico: usa el titulo_canonico normalizado para generar el código (mismo título = mismo código siempre).
- Si el nombre incluye sufijos como "Superstar", "Another Story", etc., NO los borres: devuélvelos en "subtitle".
- "clean_filename" solo puede usar el título observado LIMPIO sin traducciones.
- NO rellenes autor/año/editorial a menos que el NOMBRE lo contenga explícitamente. Si no, deja null.

Responde SOLO este JSON:
{
  "file_analysis": {
    "title_observed": "título limpio del nombre (sin nºs)",
    "subtitle": "superstar|another story|extra|null",
    "clean_filename": "slug-titulo-observado-cap-X[-Y].pdf",
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

Responde ÚNICAMENTE con el objeto JSON, sin texto adicional.`;

    try {
      return await this.executeWithRetry(async (model) => {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No se pudo extraer JSON de la respuesta');
        }

        const data = JSON.parse(jsonMatch[0]);
        
        // Extraer análisis del archivo
        const fileAnalysis = data.file_analysis || data;
        const titleObserved = fileAnalysis.title_observed || fileAnalysis.title || 'Manga Sin Título';
        let series_code = fileAnalysis.series_code;
        
        // Generar código determinista si no es válido
        if (!series_code || series_code.length !== 4) {
          series_code = this.generateSeriesCode(titleObserved);
        }
        
        // Extraer metadata de la serie
        const metadata = data.series_metadata || {};
        
        console.log('✅ IA procesó:', {
          title: titleObserved,
          subtitle: fileAnalysis.subtitle || 'ninguno',
          series_code,
          chapters: fileAnalysis.chapter_start && fileAnalysis.chapter_end 
            ? `${fileAnalysis.chapter_start}-${fileAnalysis.chapter_end}`
            : fileAnalysis.chapter,
          clean_filename: fileAnalysis.clean_filename
        });
        
        return {
          // Análisis del archivo
          title: titleObserved,
          series_code,
          normalized_title: this.normalizeTitle(titleObserved),
          clean_filename: fileAnalysis.clean_filename, // Nombre sugerido por IA
          volume: fileAnalysis.volume ? parseInt(fileAnalysis.volume) : null,
          chapter: fileAnalysis.chapter ? parseInt(fileAnalysis.chapter) : null,
          chapter_start: fileAnalysis.chapter_start ? parseInt(fileAnalysis.chapter_start) : null,
          chapter_end: fileAnalysis.chapter_end ? parseInt(fileAnalysis.chapter_end) : null,
          genre: fileAnalysis.genre || 'manga',
          is_series: fileAnalysis.is_series !== false,
          subtitle: fileAnalysis.subtitle || null,
          
          // Metadata de la serie (incluida en la misma respuesta)
          metadata: {
            official_title: metadata.official_title || titleObserved,
            author: metadata.author || null,
            year: metadata.year ? parseInt(metadata.year) : null,
            description: metadata.description || null,
            publisher: metadata.publisher || null,
            tags: Array.isArray(metadata.tags) ? metadata.tags : [],
            is_yaoi: metadata.is_yaoi || false
          }
        };
      });
    } catch (error) {
      console.error('Error con Gemini (todas las keys):', error.message);
      const basic = this.basicFilenameAnalysis(filename);
      return {
        ...basic,
        metadata: {
          official_title: basic.title,
          author: null,
          year: null,
          description: null,
          publisher: null,
          tags: [],
          is_yaoi: false
        }
      };
    }
  }

  /**
   * Análisis básico sin IA (fallback mejorado)
   */
  basicFilenameAnalysis(filename) {
    // Usar la función de corrección UTF-8 mejorada
    let name = fixUTF8Encoding(filename);
    name = name.replace(/\.pdf$/i, '');
    name = name.replace(/^\d{13,}-\d+-/, ''); // Remover timestamps de Multer
    
    // Remover códigos del nombre (ej: [1234], (5678), #9999)
    // NO los usamos, generamos el código basado en el título para agrupar correctamente
    const codeMatch = name.match(/[\[\(#](\d{4})[\]\)]/);
    if (codeMatch) {
      name = name.replace(codeMatch[0], '').trim();
    }
    
    // Primero buscar volúmenes/tomos ANTES de procesar capítulos
    const volumeMatch = name.match(/vol(?:umen)?[\s._-]*(\d+)/i);
    const tomoMatch = name.match(/tomo[\s._-]*(\d+)/i);
    
    // Ahora buscar rangos de capítulos (15-22, 1-14, etc.)
    const rangeMatch = name.match(/(\d{1,3})[\s._-]*(?:al|a|-|–|~)[\s._-]*(\d{1,3})/i);
    let chapter_start = null;
    let chapter_end = null;
    let chapter = null;
    
    if (rangeMatch) {
      chapter_start = parseInt(rangeMatch[1]);
      chapter_end = parseInt(rangeMatch[2]);
      // Remover el rango del nombre para el título
      name = name.replace(rangeMatch[0], '').trim();
    } else {
      // Buscar capítulo individual AL INICIO (23, 24, etc.)
      let leadingChapterMatch = name.match(/^(\d{1,3})[\s¡!¿?._\-]+/);
      if (leadingChapterMatch) {
        const num = parseInt(leadingChapterMatch[1]);
        if (num >= 1 && num <= 999) { // Rango válido para capítulos
          chapter = num;
          chapter_start = num;
          chapter_end = num;
          // IMPORTANTE: Remover el número del nombre para el título
          name = name.substring(leadingChapterMatch[0].length).trim();
        }
      }
      
      // Si no encontró capítulo al inicio, buscar AL FINAL (ej: "Title 2", "Title 15")
      if (!chapter) {
        // Buscar número al final: " 2", " 15", etc.
        const trailingChapterMatch = name.match(/[\s._\-]+(\d{1,3})$/);
        if (trailingChapterMatch) {
          const num = parseInt(trailingChapterMatch[1]);
          if (num >= 1 && num <= 999) { // Rango válido para capítulos
            chapter = num;
            chapter_start = num;
            chapter_end = num;
            // IMPORTANTE: Remover el número del nombre para el título
            name = name.substring(0, trailingChapterMatch.index).trim();
          }
        }
      }
      
      // Si AÚN no hay capítulo, y el nombre no tiene sufijos explícitos (vol/cap), asignar capítulo 1 por defecto
      if (!chapter && !volumeMatch && !tomoMatch) {
        // Solo si parece ser primer capítulo/volumen (sin números detectados)
        const hasNoNumbers = !/\d/.test(name);
        if (hasNoNumbers) {
          chapter = 1;
          chapter_start = 1;
          chapter_end = 1;
        }
      }
    }
    
    if (!chapter && !chapter_start) {
      const chapterMatch = name.match(/cap(?:itulo)?[\s._-]*(\d+)/i) || name.match(/ch(?:apter)?[\s._-]*(\d+)/i);
      if (chapterMatch) {
        chapter = parseInt(chapterMatch[1]);
        chapter_start = chapter;
        chapter_end = chapter;
      }
    }
    
    const volume = volumeMatch ? parseInt(volumeMatch[1]) : (tomoMatch ? parseInt(tomoMatch[1]) : null);
    
    // Limpiar el título final
    let title = name
      .replace(/vol(?:umen)?[\s._-]*\d+/gi, '') // Remover volumen
      .replace(/cap(?:itulo)?s?[\s._-]*\d+/gi, '') // Remover capítulo
      .replace(/ch(?:apter)?s?[\s._-]*\d+/gi, '') // Remover chapter
      .replace(/tomo[\s._-]*\d+/gi, '') // Remover tomo
      .replace(/[\s!¡¿?._\-]+/g, ' ') // Normalizar espacios y símbolos
      .trim();
    
    // Si el título quedó vacío o muy corto, es un error
    if (!title || title.length < 3) {
      title = 'Manga Sin Título';
    }
    
    // Generar código basado en el título limpio (mismo título = mismo código)
    // SIEMPRE se genera basado en el título, ignorando códigos manuales en el nombre del archivo
    const series_code = this.generateSeriesCode(title);
    
    return {
      title,
      series_code,
      normalized_title: this.normalizeTitle(title),
      volume,
      chapter,
      chapter_start,
      chapter_end,
      genre: 'manga',
      is_series: !!(volume || chapter || chapter_start || chapter_end),
      metadata: {
        official_title: title,
        author: null,
        year: null,
        description: null,
        publisher: null,
        tags: [],
        is_yaoi: false
      }
    };
  }

  /**
   * Genera un nombre de archivo limpio basado en el análisis
   */
  generateCleanFilename(analysis) {
    // Usar el título normalizado como base
    let cleanTitle = analysis.normalized_title || analysis.title;
    
    // Sanitizar el título para usar en nombres de archivo
    cleanTitle = cleanTitle
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, '-') // Espacios a guiones
      .replace(/-+/g, '-') // Múltiples guiones a uno
      .substring(0, 50); // Limitar longitud
    
    // Agregar información de capítulo/volumen
    let chapterPart = '';
    if (analysis.chapter_start && analysis.chapter_end && analysis.chapter_start !== analysis.chapter_end) {
      chapterPart = `-cap-${analysis.chapter_start}-${analysis.chapter_end}`;
    } else if (analysis.chapter || analysis.chapter_start) {
      const ch = analysis.chapter || analysis.chapter_start;
      chapterPart = `-cap-${ch}`;
    } else if (analysis.volume) {
      chapterPart = `-vol-${analysis.volume}`;
    }
    
    // Agregar código de serie si existe
    const codePart = analysis.series_code ? `-[${analysis.series_code}]` : '';
    
    return `${cleanTitle}${chapterPart}${codePart}.pdf`;
  }
}

module.exports = GeminiServiceWithRotation;
