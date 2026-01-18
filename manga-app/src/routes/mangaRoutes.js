const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Sistema de cola para solicitudes a la API
class RequestQueue {
  constructor(concurrency = 1, delayBetweenRequests = 1000) {
    this.queue = [];
    this.processing = 0;
    this.concurrency = concurrency;
    this.delay = delayBetweenRequests;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.processing++;
    const { fn, resolve, reject } = this.queue.shift();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.processing--;
      
      // Esperar antes de procesar la siguiente solicitud
      if (this.queue.length > 0) {
        setTimeout(() => this.process(), this.delay);
      }
    }
  }

  getQueueLength() {
    return this.queue.length;
  }

  isProcessing() {
    return this.processing > 0;
  }
}

// Instancia global de la cola (1 solicitud a la vez, 1 segundo entre solicitudes)
const apiQueue = new RequestQueue(1, 1000);

// Función para consultar la API de webcomic-inme
async function consultarAPIVigilancia(webSource, urlSource) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ web: webSource, url: urlSource });
    
    const options = {
      hostname: 'webcomic-inme',  // Usar el nombre del contenedor
      port: 8000,  // Puerto interno del contenedor (no el mapeado)
      path: '/api/realtime/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          if (jsonData.success && jsonData.data) {
            resolve({
              capitulosDisponibles: jsonData.data.Capitulos_disponible || jsonData.data.capitulos_disponible || null,
              proximaFechaCapitulo: jsonData.data.proximo_capitulo_estimado || jsonData.data.proximo_cap || null
            });
          } else {
            resolve({ capitulosDisponibles: null, proximaFechaCapitulo: null });
          }
        } catch (e) {
          resolve({ capitulosDisponibles: null, proximaFechaCapitulo: null });
        }
      });
    });
    
    req.on('error', () => {
      resolve({ capitulosDisponibles: null, proximaFechaCapitulo: null });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ capitulosDisponibles: null, proximaFechaCapitulo: null });
    });
    
    req.write(postData);
    req.end();
  });
}

// Configuración de Multer para subir portadas
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../../data/covers');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, webp)'));
    }
  }
});

// GET /api/mangas - Listar todos los mangas
router.get('/', async (req, res) => {
  try {
    const mangas = await prisma.manga.findMany({
      include: {
        links: true,
        _count: {
          select: { links: true }
        }
      },
      orderBy: {
        fechaActualizacion: 'desc'
      }
    });
    res.json(mangas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mangas', message: error.message });
  }
});

// GET /api/mangas/pendientes - Mangas sin calificación o con comentario por defecto
router.get('/pendientes', async (req, res) => {
  try {
    const mangas = await prisma.manga.findMany({
      where: {
        OR: [
          { calificacion: null },
          { comentarioOpinion: { startsWith: 'Importado desde Komga' } }
        ]
      },
      orderBy: { id: 'asc' },
      include: { links: true }
    });
    res.json(mangas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mangas pendientes', message: error.message });
  }
});

// GET /api/mangas/:id - Obtener detalle de un manga
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const manga = await prisma.manga.findUnique({
      where: { id: parseInt(id) },
      include: {
        links: true
      }
    });
    
    if (!manga) {
      return res.status(404).json({ error: 'Manga no encontrado' });
    }
    
    res.json(manga);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener manga', message: error.message });
  }
});

// POST /api/mangas - Crear un nuevo manga
router.post('/', async (req, res) => {
  try {
    const { titulo, tipo, estadoLectura, capituloActual, calificacion, comentarioOpinion, vigilarManga, webSource, urlSource } = req.body;
    
    // Validación básica
    if (!titulo || titulo.trim() === '') {
      return res.status(400).json({ error: 'El título es requerido' });
    }
    
    // Validar configuración de vigilancia
    if (vigilarManga && (!webSource || !urlSource)) {
      return res.status(400).json({ 
        error: 'Para activar la vigilancia debes seleccionar la fuente web y proporcionar la URL' 
      });
    }
    
    // Verificar si ya existe un manga con ese título
    const mangaExistente = await prisma.manga.findFirst({
      where: {
        titulo: {
          equals: titulo.trim(),
          mode: 'insensitive'
        }
      }
    });
    
    if (mangaExistente) {
      return res.status(409).json({ 
        error: 'Ya existe un manga con ese título', 
        mangaId: mangaExistente.id 
      });
    }
    
    // Validar capituloActual si viene
    if (capituloActual !== undefined && capituloActual !== null && capituloActual !== '') {
      const capituloNum = parseInt(capituloActual);
      if (isNaN(capituloNum) || capituloNum < 0) {
        return res.status(400).json({ error: 'El capítulo debe ser un número entero positivo' });
      }
    }
    
    // Validar calificación
    if (calificacion !== undefined && calificacion !== null && calificacion !== '') {
      const calif = parseInt(calificacion);
      if (isNaN(calif) || calif < 1 || calif > 5) {
        return res.status(400).json({ error: 'La calificación debe ser un número entre 1 y 5' });
      }
    }
    
    // Preparar datos base
    const dataManga = {
      titulo: titulo.trim(),
      tipo: tipo || null,
      estadoLectura: estadoLectura || 'no_empezado',
      capituloActual: capituloActual ? parseInt(capituloActual) : null,
      calificacion: calificacion ? parseInt(calificacion) : null,
      comentarioOpinion: comentarioOpinion || null,
      vigilarManga: vigilarManga || false,
      webSource: webSource || null,
      urlSource: urlSource || null
    };
    
    // Si se activa la vigilancia y hay datos de fuente, consultar API inmediatamente
    if (vigilarManga && webSource && urlSource) {
      const queueLength = apiQueue.getQueueLength();
      console.log(`🔍 Consultando API para nuevo manga: ${titulo}`);
      console.log(`   Web: ${webSource}, URL: ${urlSource}`);
      if (queueLength > 0) {
        console.log(`⏳ En cola: ${queueLength} solicitud(es) esperando`);
      }
      
      try {
        const datosVigilancia = await apiQueue.add(() => consultarAPIVigilancia(webSource, urlSource));
        // Manejar valores null de la API (manga "Coming Soon")
        dataManga.capitulosDisponibles = datosVigilancia.capitulosDisponibles || '0';
        dataManga.proximaFechaCapitulo = datosVigilancia.proximaFechaCapitulo || 'Pendiente';
        console.log(`✅ Datos obtenidos - Capítulos: ${dataManga.capitulosDisponibles}, Próximo: ${dataManga.proximaFechaCapitulo}`);
      } catch (error) {
        console.error(`❌ Error consultando API: ${error.message}`);
        dataManga.capitulosDisponibles = '0';
        dataManga.proximaFechaCapitulo = 'Error al consultar';
      }
    }
    
    const manga = await prisma.manga.create({
      data: dataManga
    });
    
    res.status(201).json(manga);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear manga', message: error.message });
  }
});

// PUT /api/mangas/:id - Actualizar un manga
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, tipo, estadoLectura, capituloActual, calificacion, comentarioOpinion, vigilarManga, webSource, urlSource } = req.body;
    
    // Verificar que el manga existe
    const mangaExistente = await prisma.manga.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!mangaExistente) {
      return res.status(404).json({ error: 'Manga no encontrado' });
    }
    
    // Validación básica
    if (titulo !== undefined && titulo.trim() === '') {
      return res.status(400).json({ error: 'El título no puede estar vacío' });
    }
    
    // Validar configuración de vigilancia al activarla
    if (vigilarManga === true) {
      const webSourceFinal = webSource || mangaExistente.webSource;
      const urlSourceFinal = urlSource || mangaExistente.urlSource;
      
      if (!webSourceFinal || !urlSourceFinal) {
        return res.status(400).json({ 
          error: 'Para activar la vigilancia debes seleccionar la fuente web y proporcionar la URL' 
        });
      }
    }
    
    // Preparar datos para actualizar (solo campos editables por el usuario)
    const dataToUpdate = {};
    
    // Campos básicos del manga
    if (titulo !== undefined) dataToUpdate.titulo = titulo.trim();
    if (tipo !== undefined) dataToUpdate.tipo = tipo || null;
    if (estadoLectura !== undefined) dataToUpdate.estadoLectura = estadoLectura;
    if (capituloActual !== undefined) {
      dataToUpdate.capituloActual = capituloActual ? parseInt(capituloActual) : null;
    }
    if (calificacion !== undefined) {
      const calif = calificacion ? parseInt(calificacion) : null;
      if (calif !== null && (calif < 1 || calif > 5)) {
        return res.status(400).json({ error: 'La calificación debe ser entre 1 y 5' });
      }
      dataToUpdate.calificacion = calif;
    }
    if (comentarioOpinion !== undefined) dataToUpdate.comentarioOpinion = comentarioOpinion || null;
    
    // Configuración de vigilancia (solo si realmente cambió)
    const vigilanciaChanged = (
      (vigilarManga !== undefined && vigilarManga !== mangaExistente.vigilarManga) ||
      (webSource !== undefined && webSource !== mangaExistente.webSource) ||
      (urlSource !== undefined && urlSource !== mangaExistente.urlSource)
    );
    
    if (vigilanciaChanged) {
      if (vigilarManga !== undefined) dataToUpdate.vigilarManga = vigilarManga;
      if (webSource !== undefined) dataToUpdate.webSource = webSource || null;
      if (urlSource !== undefined) dataToUpdate.urlSource = urlSource || null;
    }
    
    // Solo consultar la API si la configuración de vigilancia cambió y está activada
    if (vigilanciaChanged) {
      const vigilarFinal = vigilarManga !== undefined ? vigilarManga : mangaExistente.vigilarManga;
      const webSourceFinal = webSource !== undefined ? webSource : mangaExistente.webSource;
      const urlSourceFinal = urlSource !== undefined ? urlSource : mangaExistente.urlSource;
      
      // Si vigilancia está activada y hay datos de fuente, consultar API inmediatamente
      if (vigilarFinal && webSourceFinal && urlSourceFinal) {
      const queueLength = apiQueue.getQueueLength();
      console.log(`🔍 Consultando API para actualización: ${titulo}`);
      console.log(`   Web: ${webSourceFinal}, URL: ${urlSourceFinal}`);
      if (queueLength > 0) {
        console.log(`⏳ En cola: ${queueLength} solicitud(es) esperando`);
      }
      
      try {
        const datosVigilancia = await apiQueue.add(() => consultarAPIVigilancia(webSourceFinal, urlSourceFinal));
        const capitulosNuevos = datosVigilancia.capitulosDisponibles || '0';
        const capitulosAnteriores = mangaExistente.capitulosDisponibles;
        
        dataToUpdate.capitulosDisponibles = capitulosNuevos;
        dataToUpdate.proximaFechaCapitulo = datosVigilancia.proximaFechaCapitulo || 'Pendiente';
        
        // Detectar nuevos capítulos
        if (capitulosAnteriores && capitulosNuevos) {
          const numAnterior = parseInt(capitulosAnteriores);
          const numNuevo = parseInt(capitulosNuevos);
          
          if (!isNaN(numAnterior) && !isNaN(numNuevo) && numNuevo > numAnterior) {
            console.log(`🆕 ¡NUEVOS CAPÍTULOS DETECTADOS! ${numAnterior} → ${numNuevo}`);
            dataToUpdate.tieneNuevosCapitulos = true;
            // TODO: Enviar notificación push aquí
          }
        }
        
        console.log(`✅ Datos obtenidos - Capítulos: ${capitulosNuevos}, Próximo: ${dataToUpdate.proximaFechaCapitulo}`);
      } catch (error) {
        console.error(`❌ Error consultando API: ${error.message}`);
        dataToUpdate.capitulosDisponibles = '0';
        dataToUpdate.proximaFechaCapitulo = 'Error al consultar';
      }
    }
    }
    
    const manga = await prisma.manga.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      include: {
        links: true
      }
    });
    
    res.json(manga);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar manga', message: error.message });
  }
});

// DELETE /api/mangas/:id - Eliminar un manga
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el manga existe
    const manga = await prisma.manga.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!manga) {
      return res.status(404).json({ error: 'Manga no encontrado' });
    }
    
    // Eliminar la portada si existe
    if (manga.portadaUrl) {
      const portadaPath = path.join(__dirname, '../../data/covers', manga.portadaUrl);
      if (fs.existsSync(portadaPath)) {
        fs.unlinkSync(portadaPath);
      }
    }
    
    // Eliminar manga (los links se eliminan en cascada)
    await prisma.manga.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Manga eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar manga', message: error.message });
  }
});

// POST /api/mangas/:id/portada - Subir/actualizar portada
router.post('/:id/portada', upload.single('portada'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }
    
    // Verificar que el manga existe
    const manga = await prisma.manga.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!manga) {
      // Eliminar el archivo subido
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Manga no encontrado' });
    }
    
    // Eliminar portada anterior si existe
    if (manga.portadaUrl) {
      const oldPortadaPath = path.join(__dirname, '../../data/covers', manga.portadaUrl);
      if (fs.existsSync(oldPortadaPath)) {
        fs.unlinkSync(oldPortadaPath);
      }
    }
    
    // Actualizar manga con la nueva portada
    const mangaActualizado = await prisma.manga.update({
      where: { id: parseInt(id) },
      data: {
        portadaUrl: req.file.filename
      }
    });
    
    res.json({
      message: 'Portada actualizada correctamente',
      portadaUrl: `/covers/${req.file.filename}`,
      manga: mangaActualizado
    });
  } catch (error) {
    // Eliminar el archivo si hubo un error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Error al subir portada', message: error.message });
  }
});

// POST /api/mangas/:id/links - Agregar un link a un manga
router.post('/:id/links', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombreFuente, url, esPrincipal } = req.body;
    
    // Validaciones
    if (!nombreFuente || nombreFuente.trim() === '') {
      return res.status(400).json({ error: 'El nombre de la fuente es requerido' });
    }
    
    if (!url || url.trim() === '') {
      return res.status(400).json({ error: 'La URL es requerida' });
    }
    
    // Verificar que el manga existe
    const manga = await prisma.manga.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!manga) {
      return res.status(404).json({ error: 'Manga no encontrado' });
    }
    
    const link = await prisma.link.create({
      data: {
        mangaId: parseInt(id),
        nombreFuente: nombreFuente.trim(),
        url: url.trim(),
        esPrincipal: esPrincipal || false
      }
    });
    
    res.status(201).json(link);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear link', message: error.message });
  }
});

// POST /api/mangas/:id/marcar-visto - Marcar nuevos capítulos como vistos
router.post('/:id/marcar-visto', async (req, res) => {
  try {
    const { id } = req.params;
    
    const manga = await prisma.manga.update({
      where: { id: parseInt(id) },
      data: { tieneNuevosCapitulos: false }
    });
    
    res.json({ success: true, manga });
  } catch (error) {
    res.status(500).json({ error: 'Error al marcar como visto', message: error.message });
  }
});

// GET /api/mangas/nuevos - Obtener mangas con nuevos capítulos
router.get('/nuevos', async (req, res) => {
  try {
    const mangasNuevos = await prisma.manga.findMany({
      where: {
        tieneNuevosCapitulos: true
      },
      select: {
        id: true,
        titulo: true,
        capitulosDisponibles: true,
        proximaFechaCapitulo: true,
        portadaUrl: true
      }
    });
    
    res.json(mangasNuevos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mangas nuevos', message: error.message });
  }
});

// GET /api/mangas/queue/status - Estado de la cola de procesamiento
router.get('/queue/status', (req, res) => {
  res.json({
    queueLength: apiQueue.getQueueLength(),
    processing: apiQueue.isProcessing(),
    message: apiQueue.getQueueLength() > 0 
      ? `${apiQueue.getQueueLength()} solicitud(es) en espera`
      : apiQueue.isProcessing()
        ? 'Procesando solicitud actual'
        : 'Cola vacía'
  });
});

module.exports = router;
