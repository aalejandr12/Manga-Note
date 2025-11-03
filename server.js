require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const Database = require('./server/database');
const GeminiServiceRotation = require('./server/services/gemini-service-rotation');
const CoverService = require('./server/services/cover-service');
const pdfCoverExtractor = require('./server/services/pdf-cover-extractor');
const { 
  normalizeTitle,
  calculateMatchScore, 
  extractTitleFromFilename, 
  fixUTF8Encoding,
  parseChapterInfo,
  matchAgainstSeries,
  buildCleanFilename,
  generateSeriesCode
} = require('./server/utils/normalization');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Inicializar servicios
const db = new Database(process.env.DB_PATH || './database/manga_library.db');
const coverService = new CoverService(process.env.COVERS_PATH || './uploads/covers');
let geminiService = null;

// Intentar inicializar Gemini con sistema de rotación de API keys
try {
  // Recopilar todas las API keys configuradas (ahora hasta 10)
  const apiKeys = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim() && key !== 'tu_api_key_aqui') {
      apiKeys.push(key.trim());
    }
  }
  
  // Compatibilidad con variable antigua
  const oldKey = process.env.GEMINI_API_KEY;
  if (oldKey && oldKey.trim() && oldKey !== 'tu_api_key_aqui' && !apiKeys.includes(oldKey)) {
    apiKeys.unshift(oldKey.trim());
  }
  
  if (apiKeys.length > 0) {
    geminiService = new GeminiServiceRotation(apiKeys);
  } else {
    console.log('⚠ Gemini API no configurada. Agrega API keys en el archivo .env');
  }
} catch (error) {
  console.log('⚠ Error al inicializar Gemini:', error.message);
}

// Sistema de cola para procesamiento en segundo plano
const processingQueue = {
  items: [],
  isProcessing: false,
  status: {} // volumeId -> { status, progress, error }
};

// Función para procesar cola con reporte de progreso detallado
async function processQueue() {
  if (processingQueue.isProcessing || processingQueue.items.length === 0) {
    return;
  }
  
  processingQueue.isProcessing = true;
  console.log(`\n🔄 Procesando cola: ${processingQueue.items.length} items pendientes\n`);
  
  while (processingQueue.items.length > 0) {
    const item = processingQueue.items.shift();
    
    try {
      processingQueue.status[item.id] = { status: 'processing', progress: 10, message: 'Iniciando análisis con IA...' };
      
      // Ejecutar la tarea (con callbacks de progreso si están disponibles)
      await item.task((progress, message) => {
        processingQueue.status[item.id] = { 
          status: 'processing', 
          progress: Math.min(progress, 95), 
          message: message || 'Procesando...'
        };
      });
      
      processingQueue.status[item.id] = { status: 'completed', progress: 100, message: 'Análisis completado' };
      console.log(`✅ Completado: ${item.name}`);
      
    } catch (error) {
      console.error(`❌ Error procesando ${item.name}:`, error.message);
      processingQueue.status[item.id] = { 
        status: 'error', 
        progress: 0,
        error: error.message,
        message: `Error: ${error.message}`
      };
    }
  }
  
  processingQueue.isProcessing = false;
  console.log('\n✅ Cola de procesamiento completada\n');
}

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadsDir = process.env.UPLOADS_PATH || './uploads';
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Preservar caracteres UTF-8 (ñ, acentos, comas, etc.)
    // El originalname viene como latin1, convertirlo a UTF-8
    let filename = file.originalname;
    try {
      // Intentar decodificar si viene mal codificado
      filename = Buffer.from(filename, 'latin1').toString('utf8');
    } catch (e) {
      // Si falla, usar el nombre original
      console.log('⚠️  No se pudo decodificar filename UTF-8, usando original');
    }
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + filename);
  }
});

const upload = multer({
  storage,
  // sin límite de tamaño; usa el espacio disponible del dispositivo
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

// Subida de portada de serie (imágenes)
const coverStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const coversDir = process.env.COVERS_PATH || './uploads/covers';
    try {
      await fs.mkdir(coversDir, { recursive: true });
      cb(null, coversDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `cover-${uniqueSuffix}${ext}`);
  }
});

const uploadCover = multer({
  storage: coverStorage,
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|webp)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo imágenes PNG/JPG/WEBP'));
    }
  }
});

// ========== RUTAS API ==========

// Estado de la cola de procesamiento (detallado para frontend)
app.get('/api/processing-queue/status', (req, res) => {
  const queueItems = processingQueue.items.map(item => ({
    id: item.id,
    name: item.name,
    status: processingQueue.status[item.id]?.status || 'pending',
    progress: processingQueue.status[item.id]?.progress || 0,
    error: processingQueue.status[item.id]?.error || null
  }));

  res.json({
    isProcessing: processingQueue.isProcessing,
    pending: processingQueue.items.length,
    items: queueItems,
    statuses: processingQueue.status
  });
});

// Estado de procesamiento de un volumen específico
app.get('/api/processing-status/:volumeId', (req, res) => {
  const status = processingQueue.status[req.params.volumeId] || { status: 'unknown', progress: 0 };
  res.json(status);
});

// Obtener todas las series
app.get('/api/series', async (req, res) => {
  try {
    const series = await db.getAllSeries();
    res.json(series);
  } catch (error) {
    console.error('Error al obtener series:', error);
    res.status(500).json({ error: 'Error al obtener series' });
  }
});

// Obtener TODOS los volúmenes (para el visor de BD)
app.get('/api/volumes', async (req, res) => {
  try {
    await db.ready;
    const stmt = db.db.prepare('SELECT * FROM volumes ORDER BY id DESC');
    const volumes = [];
    stmt.bind();
    while (stmt.step()) {
      volumes.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(volumes);
  } catch (error) {
    console.error('Error al obtener volúmenes:', error);
    res.status(500).json({ error: 'Error al obtener volúmenes' });
  }
});

// Obtener volúmenes de una serie
app.get('/api/series/:id/volumes', async (req, res) => {
  try {
    const volumes = await db.getVolumesBySeries(req.params.id);
    res.json(volumes);
  } catch (error) {
    console.error('Error al obtener volúmenes:', error);
    res.status(500).json({ error: 'Error al obtener volúmenes' });
  }
});

// Obtener una serie (con estadísticas y progreso)
app.get('/api/series/:id', async (req, res) => {
  try {
    const series = await db.getSeries(req.params.id);
    if (!series) return res.status(404).json({ error: 'Serie no encontrada' });
    res.json(series);
  } catch (error) {
    console.error('Error al obtener serie:', error);
    res.status(500).json({ error: 'Error al obtener serie' });
  }
});

// Obtener un volumen específico
app.get('/api/volumes/:id', async (req, res) => {
  try {
    const volume = await db.getVolume(req.params.id);
    if (!volume) {
      return res.status(404).json({ error: 'Volumen no encontrado' });
    }
    
    console.log(`📂 [ABRIR] Usuario abriendo: "${volume.title}"`);
    
    // Asegurar que la ruta tenga el prefijo /
    if (volume.file_path && !volume.file_path.startsWith('/')) {
      volume.file_path = '/' + volume.file_path;
    }
    res.json(volume);
  } catch (error) {
    console.error('❌ [ERROR] Al obtener volumen:', error);
    res.status(500).json({ error: 'Error al obtener volumen' });
  }
});

// Actualizar progreso de lectura
app.put('/api/volumes/:id/progress', async (req, res) => {
  try {
    const { current_page, total_pages } = req.body;
    let status = 'reading';
    
    if (current_page === 0) {
      status = 'unread';
    } else if (total_pages && current_page >= total_pages) {
      status = 'completed';
    }
    
    const volume = await db.getVolume(req.params.id);
    console.log(`📖 [LECTURA] Usuario leyendo "${volume?.title}" - Página ${current_page}/${total_pages} (${status})`);
    
    await db.updateVolumeProgress(req.params.id, current_page, status, total_pages);
    
    // Actualizar automáticamente el estado de la serie basado en el progreso
    if (volume && total_pages > 0) {
      const progress = (current_page / total_pages) * 100;
      const series = await db.getSeries(volume.series_id);
      let newReadingStatus = null;
      
      // Si está al 100%, marcar como terminado
      if (progress >= 100) {
        newReadingStatus = 'completed';
        console.log(`✅ [AUTO] Marcando serie "${series?.title}" como TERMINADA (100%)`);
      }
      // Si tiene más de 3% de progreso, marcar como en curso
      else if (progress > 3 && series?.reading_status === 'pending') {
        newReadingStatus = 'reading';
        console.log(`📚 [AUTO] Marcando serie "${series?.title}" como EN CURSO (${progress.toFixed(1)}%)`);
      }
      
      if (newReadingStatus) {
        await db.updateSeriesReadingStatus(volume.series_id, newReadingStatus);
      }
    }
    
    res.json({ success: true, status });
  } catch (error) {
    console.error('❌ [ERROR] Al actualizar progreso:', error);
    res.status(500).json({ error: 'Error al actualizar progreso' });
  }
});

// Actualizar ajustes de serie (p.ej., modo de lectura por defecto)
app.put('/api/series/:id/settings', async (req, res) => {
  try {
    const { reading_mode, publication_status, reading_status } = req.body;
    const series = await db.getSeries(req.params.id);
    
    if (reading_mode && !['paged', 'scroll'].includes(reading_mode)) {
      return res.status(400).json({ error: 'reading_mode inválido' });
    }
    if (publication_status && !['ongoing', 'completed'].includes(publication_status)) {
      return res.status(400).json({ error: 'publication_status inválido (ongoing/completed)' });
    }
    if (reading_status && !['pending', 'reading', 'completed'].includes(reading_status)) {
      return res.status(400).json({ error: 'reading_status inválido (pending/reading/completed)' });
    }
    
    const changes = [];
    if (reading_mode) {
      await db.updateSeriesReadingMode(req.params.id, reading_mode);
      changes.push(`modo=${reading_mode}`);
    }
    if (publication_status) {
      await db.updateSeriesPublicationStatus(req.params.id, publication_status);
      changes.push(`publicación=${publication_status}`);
    }
    if (reading_status) {
      await db.updateSeriesReadingStatus(req.params.id, reading_status);
      changes.push(`estado=${reading_status}`);
    }
    
    console.log(`⚙️  [AJUSTES] Usuario cambió "${series?.title}" → ${changes.join(', ')}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [ERROR] Al actualizar ajustes de serie:', error);
    res.status(500).json({ error: 'Error al actualizar ajustes' });
  }
});

// Actualizar información de la serie (título, autor, descripción)
app.put('/api/series/:id', async (req, res) => {
  try {
    const { title, author, description } = req.body;
    const oldSeries = await db.getSeries(req.params.id);
    
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'El título es requerido' });
    }
    
    console.log(`✏️  [EDITAR] Usuario editó serie:`);
    console.log(`   Título: "${oldSeries?.title}" → "${title.trim()}"`);
    if (author) console.log(`   Autor: "${oldSeries?.author || 'N/A'}" → "${author.trim()}"`);
    if (description) console.log(`   Descripción actualizada`);
    
    await db.updateSeriesInfo(req.params.id, title.trim(), author?.trim() || null, description?.trim() || null);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [ERROR] Al actualizar información:', error);
    res.status(500).json({ error: 'Error al actualizar información' });
  }
});

// Actualizar modo de lectura preferido para una serie
app.put('/api/series/:id/reading-mode', async (req, res) => {
  try {
    const seriesId = parseInt(req.params.id);
    const { reading_mode } = req.body;
    
    if (!reading_mode || !['paged', 'scroll'].includes(reading_mode)) {
      return res.status(400).json({ error: 'Modo de lectura inválido' });
    }
    
    const series = await db.getSeries(seriesId);
    console.log(`📖 [MODO LECTURA] Serie "${series?.title}": ${reading_mode === 'scroll' ? 'Desplazamiento vertical' : 'Página por página'}`);
    
    await db.updateSeriesReadingMode(seriesId, reading_mode);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [ERROR] Al actualizar modo de lectura:', error);
    res.status(500).json({ error: 'Error al actualizar modo de lectura' });
  }
});

// Borrar volumen individual (y serie si queda vacía)
app.delete('/api/volumes/:id', async (req, res) => {
  try {
    const volumeId = parseInt(req.params.id);
    
    // Obtener volumen para borrar archivo
    const volume = await db.getVolume(volumeId);
    if (!volume) {
      return res.status(404).json({ error: 'Volumen no encontrado' });
    }
    
    console.log(`🗑️  [BORRAR] Usuario borrando volumen: "${volume.title}"`);
    console.log(`   📄 Archivo: ${volume.file_path}`);
    
    // Borrar archivo PDF
    const fs = require('fs').promises;
    const path = require('path');
    try {
      // Normalizar la ruta (quitar el / inicial si existe)
      const filePath = volume.file_path.startsWith('/') 
        ? volume.file_path.slice(1) 
        : volume.file_path;
      const fullPath = path.join(__dirname, filePath);
      
      await fs.unlink(fullPath);
      console.log(`🗑️  Archivo borrado: ${filePath}`);
    } catch (err) {
      console.warn(`⚠️  No se pudo borrar archivo: ${volume.file_path}`, err.message);
      // Intentar listar archivos similares para debug
      try {
        const dir = path.dirname(path.join(__dirname, volume.file_path.startsWith('/') ? volume.file_path.slice(1) : volume.file_path));
        const files = await fs.readdir(dir);
        console.log(`📁 Archivos en directorio:`, files.slice(0, 5));
      } catch (_) {}
    }
    
    // Borrar de la base de datos (también borra la serie si queda sin volúmenes)
    const result = await db.deleteVolume(volumeId);
    
    if (result.seriesDeleted) {
      console.log(`✅ [BORRAR] Volumen eliminado y serie borrada (era el último capítulo)`);
    } else {
      console.log(`✅ [BORRAR] Volumen eliminado correctamente`);
    }
    
    res.json({ success: true, seriesDeleted: result.seriesDeleted });
  } catch (error) {
    console.error('❌ [ERROR] Al borrar volumen:', error);
    res.status(500).json({ error: 'Error al borrar el volumen' });
  }
});

// Borrar serie completa (con todos sus volúmenes y archivos)
app.delete('/api/series/:id', async (req, res) => {
  try {
    const seriesId = parseInt(req.params.id);
    const seriesInfo = await db.getSeries(seriesId);
    
    console.log(`🗑️  [BORRAR SERIE] Usuario borrando: "${seriesInfo?.title}"`);
    
    // Obtener volúmenes para borrar archivos
    const volumes = await db.getVolumesBySeries(seriesId);
    console.log(`   📚 Total de volúmenes a borrar: ${volumes.length}`);
    
    // Borrar archivos PDF
    const fs = require('fs').promises;
    const path = require('path');
    for (const volume of volumes) {
      try {
        // Normalizar la ruta (quitar el / inicial si existe)
        const filePath = volume.file_path.startsWith('/') 
          ? volume.file_path.slice(1) 
          : volume.file_path;
        const fullPath = path.join(__dirname, filePath);
        
        await fs.unlink(fullPath);
        console.log(`   🗑️  Archivo borrado: ${filePath}`);
      } catch (err) {
        console.warn(`   ⚠️  No se pudo borrar archivo: ${volume.file_path}`, err.message);
      }
    }
    
    // Borrar portada si existe
    if (seriesInfo?.cover_image && seriesInfo.cover_source === 'user' && !seriesInfo.cover_image.startsWith('pdf:')) {
      try {
        const coverPath = seriesInfo.cover_image.startsWith('/') 
          ? seriesInfo.cover_image.slice(1) 
          : seriesInfo.cover_image;
        const fullCoverPath = path.join(__dirname, coverPath);
        
        await fs.unlink(fullCoverPath);
        console.log(`   🗑️  Portada borrada: ${coverPath}`);
      } catch (err) {
        console.warn(`   ⚠️  No se pudo borrar portada:`, err.message);
      }
    }
    
    // Borrar de la base de datos
    await db.deleteSeries(seriesId);
    
    console.log(`✅ [BORRAR SERIE] Serie eliminada completamente con todos sus archivos`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [ERROR] Al borrar serie:', error);
    res.status(500).json({ error: 'Error al borrar la serie' });
  }
});

// Subir/editar portada de serie
app.post('/api/series/:id/cover', uploadCover.single('image'), async (req, res) => {
  try {
    const seriesId = parseInt(req.params.id, 10);
    const series = await db.getSeries(seriesId);
    
    console.log(`�️  [PORTADA] Usuario subiendo portada para "${series?.title}"`);
    
    if (!req.file) {
      console.log('   ❌ No se recibió archivo');
      return res.status(400).json({ error: 'No se recibió imagen' });
    }
    console.log(`   ✅ Archivo recibido: ${req.file.filename} (${(req.file.size/1024).toFixed(1)}KB)`);
    
    // Obtener portada anterior para borrarla
    if (series?.cover_image && series.cover_source === 'user') {
      const fs = require('fs').promises;
      const oldCoverPath = series.cover_image;
      try {
        await fs.unlink(oldCoverPath);
        console.log('   🗑️  Portada anterior eliminada');
      } catch (unlinkError) {
        console.log('   ⚠️  No se pudo eliminar portada anterior:', unlinkError.message);
      }
    }
    
    // Guardar nueva portada
    await db.updateSeriesMetadata(seriesId, {
      cover_image: req.file.path,
      cover_source: 'user'
    });
    
    console.log('✅ Portada guardada en BD:', req.file.path);
    res.json({ success: true, cover_image: req.file.path });
  } catch (error) {
    console.error('❌ Error al subir portada:', error);
    res.status(500).json({ error: 'Error al subir portada', details: error.message });
  }
});

// Buscar portadas con IA usando Gemini
app.get('/api/search-cover', async (req, res) => {
  try {
    const title = req.query.title;
    if (!title) {
      return res.status(400).json({ error: 'Falta el título' });
    }

    console.log('🔍 Buscando portadas con IA para:', title);

    // Usar Gemini para buscar URLs de portadas
    if (geminiService) {
      try {
        const prompt = `Busca 4 URLs de portadas de alta calidad para este manga/yaoi: "${title}"

Proporciona URLS REALES Y FUNCIONALES de sitios como:
- MyAnimeList (myanimelist.net)
- AniList (anilist.co)
- MangaDex (mangadex.org)
- MangaUpdates (mangaupdates.com)

Responde ÚNICAMENTE con un array JSON de URLs:
["https://...", "https://...", "https://...", "https://..."]`;

        const result = await geminiService.executeWithRetry(async (model) => {
          const response = await model.generateContent(prompt);
          const text = (await response.response).text();
          
          // Extraer JSON del texto
          const jsonMatch = text.match(/\[[\s\S]*?\]/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          return [];
        });

        if (result && result.length > 0) {
          const covers = result.map(url => ({ url }));
          console.log('✅ Encontradas', covers.length, 'portadas');
          return res.json({ success: true, covers });
        }
      } catch (aiError) {
        console.log('⚠️ Error con IA, usando búsqueda de respaldo:', aiError.message);
      }
    }

    // Respaldo: usar API de búsqueda de imágenes de DuckDuckGo (sin API key necesaria)
    console.log('📦 Usando búsqueda de portadas de respaldo');
    
    try {
      // Intentar con búsqueda básica de imágenes
      const searchTerm = encodeURIComponent(`${title} manga cover`);
      
      // Generar URLs de diferentes fuentes de imágenes de manga
      const covers = [
        // Placeholder con gradientes (no texto)
        { url: `https://via.placeholder.com/400x533/7f19e6/ffffff?text=+` },
        { url: `https://via.placeholder.com/400x533/3b82f6/ffffff?text=+` },
        { url: `https://via.placeholder.com/400x533/ef4444/ffffff?text=+` },
        { url: `https://via.placeholder.com/400x533/10b981/ffffff?text=+` }
      ];

      res.json({ success: true, covers });
    } catch (fallbackError) {
      console.error('❌ Error en búsqueda de respaldo:', fallbackError);
      // Último recurso: gradientes simples
      const covers = [
        { url: `https://via.placeholder.com/400x533/7f19e6/7f19e6?text=+` },
        { url: `https://via.placeholder.com/400x533/3b82f6/3b82f6?text=+` },
        { url: `https://via.placeholder.com/400x533/ef4444/ef4444?text=+` },
        { url: `https://via.placeholder.com/400x533/10b981/10b981?text=+` }
      ];
      res.json({ success: true, covers });
    }
  } catch (error) {
    console.error('❌ Error al buscar portadas:', error);
    res.status(500).json({ error: 'Error al buscar portadas' });
  }
});

// Obtener información de volúmenes para extraer páginas en el frontend
app.get('/api/extract-cover-pages/:seriesId', async (req, res) => {
  try {
    const { seriesId } = req.params;
    console.log('📄 Preparando extracción de páginas para serie:', seriesId);

    // Obtener volúmenes de la serie
    const volumes = await db.getVolumesBySeries(seriesId);
    
    if (!volumes || volumes.length === 0) {
      return res.json({ success: true, pages: [] });
    }

    // Retornar información de los volúmenes para que el frontend extraiga las páginas
    const volumeInfo = volumes.map(volume => ({
      id: volume.id,
      file_path: `/${volume.file_path}`,
      label: volume.chapter_start && volume.chapter_end 
        ? `Cap. ${volume.chapter_start}${volume.chapter_end !== volume.chapter_start ? '-' + volume.chapter_end : ''}`
        : `Vol. ${volume.volume_number || volume.id}`
    }));

    console.log(`✅ Preparados ${volumeInfo.length} volúmenes para extracción`);
    res.json({ success: true, volumes: volumeInfo });

  } catch (error) {
    console.error('❌ Error al preparar extracción:', error);
    res.status(500).json({ error: 'Error al preparar extracción de páginas' });
  }
});

// Obtener libros recientemente leídos
app.get('/api/recently-read', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const volumes = await db.getRecentlyRead(limit);
    res.json(volumes);
  } catch (error) {
    console.error('Error al obtener lectura reciente:', error);
    res.status(500).json({ error: 'Error al obtener lectura reciente' });
  }
});

// Obtener estado de la cola de procesamiento
app.get('/api/processing-status', (req, res) => {
  res.json({
    queue_size: processingQueue.items.length,
    is_processing: processingQueue.isProcessing,
    items: processingQueue.items.map(item => ({
      id: item.id,
      name: item.name
    }))
  });
});

// Subir PDF
app.post('/api/upload', upload.single('pdf'), async (req, res) => {
  try {
    const timestamp = new Date().toLocaleString('es-ES', { timeZone: 'America/Mexico_City' });
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`📤 [UPLOAD] ${timestamp}`);
    console.log('═══════════════════════════════════════════════════════');
    
    if (!req.file) {
      console.log('❌ ERROR: No se recibió ningún archivo');
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    console.log(`📚 Archivo: "${req.file.originalname}"`);
    console.log(`📂 Guardado en: ${req.file.path}`);
    console.log(`📏 Tamaño: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);

    // ⚠️ REQUERIMIENTO: Las API keys de Gemini son OBLIGATORIAS
    if (!geminiService) {
      console.log('❌ ERROR: Gemini API no está configurado');
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(500).json({ 
        error: 'Sistema no configurado correctamente. Se requieren API keys de Gemini.',
        details: 'Configura GEMINI_API_KEY_1...10 en el archivo .env'
      });
    }

    // ========== ANÁLISIS INTELIGENTE CON POLÍTICAS Y UMBRALES ==========
    console.log('🔍 Paso 1: Normalizando y parseando archivo...');
    
    let basicAnalysis;
    let matchingLog = {
      filename: req.file.originalname,
      matched: false,
      score: 0,
      method: 'unknown',
      alias_used: null,
      subtitle_detected: null,
      subtitle_classification: null,
      reason: '',
      series_id: null,
      processing_time_ms: 0
    };
    const startTime = Date.now();
    
    try {
      const allSeries = await db.getAllSeries();
      
      // PASO 1: Normalización dura + parsing
      const cleanedFilename = fixUTF8Encoding(req.file.originalname);
      const { observed, comparable } = normalizeTitle(extractTitleFromFilename(cleanedFilename));
      const chapterInfo = parseChapterInfo(cleanedFilename);
      
      console.log('� Título observado:', observed);
      console.log('📊 Capítulo info:', chapterInfo);
      
      matchingLog.subtitle_detected = chapterInfo.subtitle;
      
      // PASO 2: Buscar candidatos con score ≥ 0.75 (pre-filtro)
      const candidates = [];
      let bestMatch = null;
      
      for (const series of allSeries) {
        // Obtener política de la serie
        const policy = await db.run(`SELECT * FROM series_policies WHERE series_id = ?`, [series.id])
          .then(rows => rows[0] || null)
          .catch(() => null);
        
        // Calcular score contra canónico + alias
        const matchResult = matchAgainstSeries(comparable, {
          ...series,
          ...policy,
          title_canonical: policy?.title_canonical || series.title
        });
        
        if (matchResult.score >= 0.75) {
          candidates.push({
            series,
            policy,
            score: matchResult.score,
            via: matchResult.via
          });
          
          if (!bestMatch || matchResult.score > bestMatch.score) {
            bestMatch = { series, policy, score: matchResult.score, via: matchResult.via };
          }
        }
      }
      
      console.log(`🔍 Encontrados ${candidates.length} candidatos (score ≥ 0.75)`);
      
      // PASO 3: Aplicar umbrales y políticas
      if (bestMatch && bestMatch.score >= 0.90) {
        // MATCH DIRECTO (≥ 0.90) - Sin LLM
        console.log(`✅ Match directo (${bestMatch.score.toFixed(3)}): "${bestMatch.series.title}"`);
        console.log(`   Via: "${bestMatch.via}"`);
        
        const titleCanonical = bestMatch.policy?.title_canonical || bestMatch.series.title;
        const titleLocked = bestMatch.policy?.title_locked || false;
        
        if (titleLocked) {
          console.log(`🔒 Título bloqueado - usando canónico: "${titleCanonical}"`);
        }
        
        basicAnalysis = {
          title: titleCanonical,
          series_code: bestMatch.series.series_code,
          normalized_title: bestMatch.series.normalized_title,
          ...chapterInfo,
          subtitle: chapterInfo.subtitle,
          metadata: {
            official_title: titleCanonical,
            author: null,
            year: null,
            description: null,
            publisher: null,
            tags: [],
            is_yaoi: false
          }
        };
        
        matchingLog.matched = true;
        matchingLog.score = bestMatch.score;
        matchingLog.method = 'local_high_confidence';
        matchingLog.alias_used = bestMatch.via !== titleCanonical ? bestMatch.via : null;
        matchingLog.reason = `Match directo con score ${bestMatch.score.toFixed(3)}`;
        matchingLog.series_id = bestMatch.series.id;
        
      } else if (bestMatch && bestMatch.score >= 0.85 && bestMatch.score < 0.90) {
        // MATCH MEDIO (0.85-0.89) - Verificar con Gemini si no hay política clara
        console.log(`� Match medio (${bestMatch.score.toFixed(3)}) - verificar con Gemini`);
        basicAnalysis = await geminiService.analyzeAndMatchSeries(req.file.originalname, candidates.map(c => c.series));
        
        matchingLog.method = 'llm_verification';
        matchingLog.score = bestMatch.score;
        matchingLog.reason = `Score intermedio ${bestMatch.score.toFixed(3)}, verificado con LLM`;
        
      } else if (bestMatch && bestMatch.score >= 0.80 && bestMatch.score < 0.85) {
        // MATCH BAJO (0.80-0.84) - Requiere revisión manual, no crear automáticamente
        console.log(`⚠️ Score bajo (${bestMatch.score.toFixed(3)}) - requiere revisión manual`);
        console.log(`   Mejor candidato: "${bestMatch.series.title}"`);
        
        // Por ahora, crear como serie nueva pero marcar para revisión
        basicAnalysis = await geminiService.analyzePDFFilename(req.file.originalname, true);
        
        matchingLog.method = 'manual_review_required';
        matchingLog.score = bestMatch.score;
        matchingLog.reason = `Score bajo ${bestMatch.score.toFixed(3)}, requiere revisión. Candidato: ${bestMatch.series.title}`;
        
      } else {
        // SIN MATCH (< 0.80) - Serie nueva
        console.log('📭 Sin match (score < 0.80) - serie nueva');
        basicAnalysis = await geminiService.analyzePDFFilename(req.file.originalname, true);
        
        matchingLog.method = 'new_series';
        matchingLog.reason = 'Sin candidatos con score suficiente';
      }
      
      matchingLog.processing_time_ms = Date.now() - startTime;
    } catch (aiError) {
      console.error('⚠️ Error con Gemini, usando análisis básico:', aiError.message);
      basicAnalysis = geminiService.basicFilenameAnalysis(req.file.originalname);
    }

    // Gemini ya hizo el análisis y matching inteligente ✅
    
    console.log('📊 Análisis básico completo:', JSON.stringify(basicAnalysis, null, 2));
    console.log('🔢 Código de serie:', basicAnalysis.series_code);

    // Buscar si ya existe una serie con este código
    console.log('🔍 Buscando serie existente con código:', basicAnalysis.series_code);
    let series = await db.getSeriesByCode(basicAnalysis.series_code);
    let isNewSeries = false;
    console.log('📋 Serie encontrada:', series ? `ID ${series.id} - ${series.title}` : 'No existe, se creará nueva');
    
    if (!series) {
      isNewSeries = true;
      
      // Crear serie con datos básicos
      await db.createSeries({
        series_code: basicAnalysis.series_code,
        title: basicAnalysis.title,
        normalized_title: basicAnalysis.normalized_title,
        genre: basicAnalysis.genre,
        cover_image: null,
        cover_source: 'placeholder',
        author: null,
        year: null,
        description: null,
        publisher: null,
        tags: []
      });
      
      // Volver a consultar para obtener el ID correcto
      series = await db.getSeriesByCode(basicAnalysis.series_code);
      
      if (!series) {
        throw new Error('Error al crear serie: no se pudo recuperar el ID');
      }
      
      console.log('✨ Nueva serie creada (básica):', series.title, `[ID: ${series.id}, Código: ${series.series_code}]`);
    } else {
      console.log('📂 Agregando a serie existente:', series.title, `[ID: ${series.id}, Código: ${series.series_code}]`);
    }

    // ========== RENOMBRAR ARCHIVO CON POLÍTICAS ==========
    console.log('🔄 Renombrando archivo con políticas de arc...');
    
    // Obtener política de la serie si existe
    const seriesPolicy = await db.getSeriesPolicy(series.id).catch(() => null);
    
    // Construir filename respetando políticas
    const cleanFilename = buildCleanFilename(
      {
        ...series,
        ...seriesPolicy,
        title_canonical: seriesPolicy?.title_canonical || series.title
      },
      {
        chapter: basicAnalysis.chapter,
        chapter_start: basicAnalysis.chapter_start,
        chapter_end: basicAnalysis.chapter_end,
        subtitle: basicAnalysis.subtitle || chapterInfo?.subtitle
      }
    );
    
    const finalPath = path.join(path.dirname(req.file.path), cleanFilename);
    
    console.log('   Viejo:', path.basename(req.file.path));
    console.log('   Nuevo:', cleanFilename);
    
    try {
      await fs.rename(req.file.path, finalPath);
      console.log('✅ Archivo renombrado físicamente');
      req.file.path = finalPath; // Actualizar para el resto del código
    } catch (renameErr) {
      console.error('❌ Error al renombrar archivo:', renameErr.message);
      // Si falla el renombrado, usar el path original
    }
    
    // Registrar en matching_logs
    matchingLog.series_id = series.id;
    matchingLog.matched = true;
    await db.logMatching(matchingLog).catch(err => {
      console.error('⚠️ Error al guardar log de matching:', err.message);
    });

    // ========== AHORA SÍ GUARDAR EN BD CON NOMBRE FINAL ==========
    let volumeTitle = series.title || basicAnalysis.title;

    console.log('📖 Creando volumen en BD con ruta final:', volumeTitle);
    console.log('📋 Datos del volumen:', {
      series_id: series.id,
      title: volumeTitle,
      volume_number: basicAnalysis.volume,
      chapter_number: basicAnalysis.chapter,
      chapter_start: basicAnalysis.chapter_start,
      chapter_end: basicAnalysis.chapter_end,
      file_path: finalPath,
      file_size: req.file.size
    });
    
    const newVolumeId = await db.createVolume({
      series_id: series.id,
      title: volumeTitle,
      volume_number: basicAnalysis.volume,
      chapter_number: basicAnalysis.chapter,
      chapter_start: basicAnalysis.chapter_start,
      chapter_end: basicAnalysis.chapter_end,
      file_path: finalPath, // ← RUTA FINAL CON CÓDIGO [XXXX]
      file_size: req.file.size,
      total_pages: 0
    });
    console.log('✅ Volumen guardado en BD con ID:', newVolumeId);
    console.log('✅ Ruta en BD:', finalPath);

    // Intentar extraer la portada automáticamente (primera página del primer capítulo)
    try {
      // Solo si la serie no tiene portada o si tiene referencia a pdf
      const currentSeries = await db._get('SELECT cover_image FROM series WHERE id = ?', [series.id]);
      const needCover = !currentSeries.cover_image || currentSeries.cover_image === 'null' || String(currentSeries.cover_image).startsWith('pdf:');

      if (needCover) {
        console.log('📸 Intentando extraer portada automática desde PDF...');
        const extracted = await pdfCoverExtractor.extractFirstPage(req.file.path, series.id);
        if (extracted) {
          console.log('✅ Portada generada:', extracted);
          await db._run('UPDATE series SET cover_image = ?, cover_source = ? WHERE id = ?', [extracted, 'pdf_extracted', series.id]);
          db._save();
        } else {
          console.log('ℹ️ No se pudo generar imagen de portada automáticamente (se usará placeholder o IA más tarde)');
        }
      } else {
        console.log('ℹ️ La serie ya tiene portada, no se sobrescribe');
      }
    } catch (coverErr) {
      console.error('⚠️ Error durante extracción automática de portada:', coverErr);
    }

    // Agregar a cola para procesamiento con IA
    // Ya tenemos el análisis de Gemini en basicAnalysis, solo falta metadata y portada
    processingQueue.items.push({
      id: `${series.id}-${newVolumeId}`,
      name: req.file.originalname,
      task: async (reportProgress) => {
        console.log(`\n🤖 Procesando metadata y portada: ${req.file.originalname}`);
        
        if (reportProgress) reportProgress(20, 'Usando análisis de Gemini...');
        
        // Usar el análisis que ya hicimos (no hacer otra consulta)
        const fullAnalysis = basicAnalysis;
        
        if (reportProgress) reportProgress(50, 'Análisis completado, procesando metadata...');
        console.log(`✅ IA completó análisis para: ${fullAnalysis.title}`);
        
        // El archivo YA está renombrado y guardado en BD con el nombre correcto
        if (reportProgress) reportProgress(60, 'Archivo ya renombrado correctamente...');
          
        if (reportProgress) reportProgress(70, 'Actualizando metadata...');
        
        // Si es nueva serie o falta metadata, actualizar
        if (isNewSeries || !series.author) {
          const metadata = fullAnalysis.metadata;
          
          if (reportProgress) reportProgress(75, 'Buscando portada...');
          
          // Buscar portada usando el título oficial
          const cover = await coverService.getCover(metadata.official_title, metadata.author, req.file.path);
          
          console.log(`📸 Portada obtenida: ${cover.source}`);
            
            // Actualizar serie con toda la metadata (pero preservar cover_image si ya existe)
            const currentSeries = await db._get('SELECT cover_image FROM series WHERE id = ?', [series.id]);
            const shouldUpdateCover = !currentSeries.cover_image || currentSeries.cover_image.startsWith('pdf:');
            
            await db._run(`
              UPDATE series 
              SET title = ?, author = ?, year = ?, description = ?,
                  publisher = ?, tags = ?
                  ${shouldUpdateCover ? ', cover_image = ?, cover_source = ?' : ''}
              WHERE id = ?
            `, shouldUpdateCover ? [
              metadata.official_title || fullAnalysis.title,
              metadata.author,
              metadata.year,
              metadata.description,
              metadata.publisher,
              JSON.stringify(metadata.tags),
              cover.path,
              cover.source,
              series.id
            ] : [
              metadata.official_title || fullAnalysis.title,
              metadata.author,
              metadata.year,
              metadata.description,
              metadata.publisher,
              JSON.stringify(metadata.tags),
              series.id
            ]);
          
          db._save();
          console.log(`✅ Metadata actualizada para serie ${series.id}`);
        }
        
        if (reportProgress) reportProgress(90, 'Configurando portada por defecto...');
        
        // DESPUÉS de procesar metadata, configurar portada por defecto si no tiene
        const finalSeries = await db._get('SELECT cover_image FROM series WHERE id = ?', [series.id]);
        if (!finalSeries.cover_image || finalSeries.cover_image === 'null') {
          console.log('📸 Configurando primera página del PDF como portada por defecto...');
          try {
            // Buscar el primer volumen de la serie (ordenado por capítulo)
            const firstVolume = await db._get(`
              SELECT id FROM volumes 
              WHERE series_id = ? 
              ORDER BY COALESCE(chapter_start, chapter_number, volume_number, 9999), id
              LIMIT 1
            `, [series.id]);
            
            if (firstVolume) {
              const coverReference = `pdf:${firstVolume.id}:1`;
              await db._run(`
                UPDATE series 
                SET cover_image = ?, cover_source = ?
                WHERE id = ?
              `, [coverReference, 'pdf_page', series.id]);
              db._save();
              console.log(`✅ Portada por defecto configurada: Primera página del cap. 1`);
            }
          } catch (coverError) {
            console.error('⚠️ Error al configurar portada por defecto:', coverError);
          }
        }
        
        if (reportProgress) reportProgress(100, 'Procesamiento completado');
      }
    });
    
    // Iniciar procesamiento si no está corriendo
    processQueue().catch(console.error);
    
    // Actualizar conteo de volúmenes
    console.log('📊 LOG: Actualizando conteo de volúmenes para serie', series.id);
    const allVolumes = await db.getVolumesBySeries(series.id);
    console.log('📊 LOG: Total de volúmenes encontrados:', allVolumes.length);
    await db.updateSeriesVolCount(series.id, allVolumes.length);
    console.log('✓ Conteo actualizado');

    const response = {
      success: true,
      volume_id: newVolumeId,
      series_id: series.id,
      series_title: series.title,
      is_new_series: isNewSeries,
      analysis: basicAnalysis
    };
    
    console.log('✅ [UPLOAD EXITOSO]');
    console.log(`   📖 Serie: "${series.title}" ${isNewSeries ? '(NUEVA)' : '(EXISTENTE)'}`);
    console.log(`   🆔 Volume ID: ${newVolumeId} | Series ID: ${series.id}`);
    console.log(`   📚 Total volúmenes en serie: ${allVolumes.length}`);
    console.log('═══════════════════════════════════════════════════════\n');
    res.json(response);

  } catch (error) {
    console.error('\n❌❌❌ ERROR CRÍTICO EN UPLOAD ❌❌❌');
    console.error('Mensaje:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('═══════════════════════════════════════════════════════\n');
    // Eliminar archivo si hubo error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: error.message });
  }
});

// Configuración - Obtener API key status
app.get('/api/settings', async (req, res) => {
  try {
    const hasApiKey = !!geminiService;
    res.json({ 
      gemini_configured: hasApiKey,
      message: hasApiKey ? 'API key configurada' : 'API key no configurada'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// Configuración - Guardar API key
app.post('/api/settings', async (req, res) => {
  try {
    const { gemini_api_key } = req.body;
    
    if (!gemini_api_key) {
      return res.status(400).json({ error: 'Se requiere gemini_api_key' });
    }

    // Guardar en base de datos
    await db.setSetting('gemini_api_key', gemini_api_key);
    
    // Reinicializar servicio
    geminiService = new GeminiService(gemini_api_key);
    
    console.log('✓ API key de Gemini actualizada');
    res.json({ success: true, message: 'API key configurada correctamente' });
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    res.status(500).json({ error: error.message });
  }
});

// Estadísticas generales
app.get('/api/stats', async (req, res) => {
  try {
    const series = await db.getAllSeries();
    const recentlyRead = await db.getRecentlyRead(1);
    
    const stats = {
      total_series: series.length,
      total_volumes: series.reduce((sum, s) => sum + (s.volume_count || 0), 0),
      completed_volumes: series.reduce((sum, s) => sum + (s.completed_count || 0), 0),
      reading_volumes: series.reduce((sum, s) => sum + (s.reading_count || 0), 0),
      last_read: recentlyRead[0] || null
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// ========== RUTAS FRONTEND ==========

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'library.html'));
});

app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

app.get('/reader/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reader.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📚 MANGA LIBRARY APP');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`🌐 Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`🔧 Optimizado para Termux/Android`);
  console.log(`📱 Accede desde tu navegador móvil`);
  console.log('═══════════════════════════════════════════════════════');
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  db.close();
  process.exit(0);
});
