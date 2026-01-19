const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');

// Ruta base de mangas
const MANGAS_PATH = '/opt/MangaRead/Mangas';

// Configurar multer para uploads sin límite de tamaño
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const carpetaDestino = req.body.carpeta || req.body.nombreManga;
            if (!carpetaDestino) {
                return cb(new Error('Debe especificar carpeta o nombreManga'));
            }

            const rutaCarpeta = path.join(MANGAS_PATH, carpetaDestino);

            // Crear carpeta si no existe
            await fs.mkdir(rutaCarpeta, { recursive: true });

            cb(null, rutaCarpeta);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Mantener nombre original del archivo
        cb(null, file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Solo permitir PDFs
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'));
        }
    },
    limits: {
        fileSize: Infinity // Sin límite de tamaño
    }
});

/**
 * GET /api/mangas/carpetas
 * Listar todas las carpetas de mangas
 */
router.get('/carpetas', async (req, res) => {
    try {
        const archivos = await fs.readdir(MANGAS_PATH, { withFileTypes: true });
        const carpetas = archivos
            .filter(item => item.isDirectory())
            .map(item => item.name)
            .sort();

        res.json({
            total: carpetas.length,
            carpetas: carpetas
        });
    } catch (error) {
        console.error('Error al listar carpetas:', error);
        res.status(500).json({ error: 'Error al listar carpetas', message: error.message });
    }
});

/**
 * GET /api/mangas/carpetas/:nombre
 * Listar PDFs de una carpeta específica
 */
router.get('/carpetas/:nombre', async (req, res) => {
    try {
        const nombreCarpeta = decodeURIComponent(req.params.nombre);
        const rutaCarpeta = path.join(MANGAS_PATH, nombreCarpeta);

        // Verificar que la carpeta existe
        const stats = await fs.stat(rutaCarpeta);
        if (!stats.isDirectory()) {
            return res.status(404).json({ error: 'No es una carpeta' });
        }

        const archivos = await fs.readdir(rutaCarpeta);
        const pdfs = archivos
            .filter(archivo => archivo.toLowerCase().endsWith('.pdf'))
            .sort();

        res.json({
            carpeta: nombreCarpeta,
            total: pdfs.length,
            archivos: pdfs
        });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Carpeta no encontrada' });
        }
        console.error('Error al listar PDFs:', error);
        res.status(500).json({ error: 'Error al listar PDFs', message: error.message });
    }
});

/**
 * POST /api/mangas/subir-nuevo
 * Subir PDF y crear carpeta nueva
 */
router.post('/subir-nuevo', upload.single('archivo'), async (req, res) => {
    try {
        const nombreManga = req.body.nombreManga;

        if (!nombreManga) {
            return res.status(400).json({ error: 'Debe especificar nombreManga' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Debe subir un archivo PDF' });
        }

        res.json({
            success: true,
            mensaje: 'Manga subido exitosamente',
            carpeta: nombreManga,
            archivo: req.file.filename,
            tamaño: req.file.size,
            ruta: req.file.path
        });
    } catch (error) {
        console.error('Error al subir nuevo manga:', error);
        res.status(500).json({ error: 'Error al subir manga', message: error.message });
    }
});

/**
 * POST /api/mangas/agregar-capitulo
 * Agregar PDF a carpeta existente
 */
router.post('/agregar-capitulo', upload.single('archivo'), async (req, res) => {
    try {
        const carpeta = req.body.carpeta;

        if (!carpeta) {
            return res.status(400).json({ error: 'Debe especificar carpeta' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Debe subir un archivo PDF' });
        }

        res.json({
            success: true,
            mensaje: 'Capítulo agregado exitosamente',
            carpeta: carpeta,
            archivo: req.file.filename,
            tamaño: req.file.size,
            ruta: req.file.path
        });
    } catch (error) {
        console.error('Error al agregar capítulo:', error);
        res.status(500).json({ error: 'Error al agregar capítulo', message: error.message });
    }
});

/**
 * DELETE /api/mangas/eliminar
 * Eliminar archivo PDF
 */
router.delete('/eliminar', async (req, res) => {
    try {
        const { carpeta, archivo } = req.body;

        if (!carpeta || !archivo) {
            return res.status(400).json({ error: 'Debe especificar carpeta y archivo' });
        }

        const rutaArchivo = path.join(MANGAS_PATH, carpeta, archivo);

        // Verificar que el archivo existe y es PDF
        const stats = await fs.stat(rutaArchivo);
        if (!stats.isFile() || !archivo.toLowerCase().endsWith('.pdf')) {
            return res.status(400).json({ error: 'El archivo no es válido' });
        }

        // Eliminar archivo
        await fs.unlink(rutaArchivo);

        res.json({
            success: true,
            mensaje: 'Archivo eliminado exitosamente',
            carpeta: carpeta,
            archivo: archivo
        });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }
        console.error('Error al eliminar archivo:', error);
        res.status(500).json({ error: 'Error al eliminar archivo', message: error.message });
    }
});

module.exports = router;
