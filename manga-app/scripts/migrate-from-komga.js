// Script para migrar datos desde Komga a la app de Mangas
// Uso: node scripts/migrate-from-komga.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Configuración
const KOMGA_DB_PATH = process.env.KOMGA_DB_PATH || '/opt/MangaRead/komga-config/database.sqlite';
const KOMGA_COVERS_PATH = process.env.KOMGA_COVERS_PATH || '/opt/MangaRead/Mangas';
const APP_COVERS_PATH = path.join(__dirname, '../data/covers');

// Estado de lectura de Komga a nuestra app
const estadoKomgaAApp = {
  'UNREAD': 'no_empezado',
  'IN_PROGRESS': 'leyendo',
  'READ': 'terminado',
  // Komga no tiene "en pausa" explícito
};

async function conectarKomgaDB() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(KOMGA_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ Conectado a la base de datos de Komga');
        resolve(db);
      }
    });
  });
}

async function obtenerSeriesKomga(db) {
  return new Promise((resolve, reject) => {
    // Query actualizado para la estructura real de Komga
    const query = `
      SELECT 
        s.ID as id,
        s.NAME as name,
        s.URL as url,
        s.FILE_LAST_MODIFIED as file_last_modified,
        s.BOOK_COUNT as book_count,
        rp.READ_COUNT as books_read_count,
        rp.IN_PROGRESS_COUNT as books_in_progress_count,
        (s.BOOK_COUNT - COALESCE(rp.READ_COUNT, 0) - COALESCE(rp.IN_PROGRESS_COUNT, 0)) as books_unread_count
      FROM SERIES s
      LEFT JOIN READ_PROGRESS_SERIES rp ON s.ID = rp.SERIES_ID
      WHERE s.DELETED_DATE IS NULL
      ORDER BY s.NAME
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        console.log(`📚 Encontradas ${rows.length} series en Komga`);
        resolve(rows);
      }
    });
  });
}

async function obtenerThumbnailPath(db, seriesId, thumbnailId) {
  if (!thumbnailId) return null;
  
  return new Promise((resolve, reject) => {
    const query = `SELECT url FROM series WHERE id = ?`;
    
    db.get(query, [seriesId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row ? row.url : null);
      }
    });
  });
}

function determinarEstado(serie) {
  // Valores por defecto si no hay datos
  const bookCount = serie.book_count || 0;
  const booksRead = serie.books_read_count || 0;
  const booksInProgress = serie.books_in_progress_count || 0;
  
  // Si todos los libros están leídos
  if (bookCount > 0 && booksRead === bookCount) {
    return 'terminado';
  }
  
  // Si tiene libros en progreso o algunos leídos
  if (booksRead > 0 || booksInProgress > 0) {
    return 'leyendo';
  }
  
  // Si no tiene nada leído
  return 'no_empezado';
}

async function copiarPortada(serieUrl, mangaTitulo) {
  try {
    // Decodificar el nombre de la carpeta (quitar codificación URL)
    const decodedUrl = decodeURIComponent(serieUrl);
    const seriesDir = path.join(KOMGA_COVERS_PATH, path.basename(decodedUrl));
    
    if (!fs.existsSync(seriesDir)) {
      // Intentar también con el título del manga
      const altDir = path.join(KOMGA_COVERS_PATH, mangaTitulo);
      if (!fs.existsSync(altDir)) {
        console.log(`   ⚠️  No se encontró la carpeta: ${seriesDir}`);
        return null;
      }
      // Usar el directorio alternativo
      return copiarPortadaDesdeDir(altDir, mangaTitulo);
    }
    
    return copiarPortadaDesdeDir(seriesDir, mangaTitulo);
  } catch (error) {
    console.error(`   ❌ Error copiando portada: ${error.message}`);
    return null;
  }
}

function copiarPortadaDesdeDir(seriesDir, mangaTitulo) {
  try {
    // Buscar archivos de imagen comunes
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const files = fs.readdirSync(seriesDir);
    
    // Buscar cover.jpg, cover.png, o la primera imagen
    let coverFile = files.find(f => 
      f.toLowerCase().includes('cover') && 
      imageExtensions.some(ext => f.toLowerCase().endsWith(ext))
    );
    
    if (!coverFile) {
      // Buscar la primera imagen
      coverFile = files.find(f => 
        imageExtensions.some(ext => f.toLowerCase().endsWith(ext))
      );
    }
    
    if (!coverFile) {
      console.log(`   ⚠️  No se encontró portada en: ${seriesDir}`);
      return null;
    }
    
    const sourcePath = path.join(seriesDir, coverFile);
    const extension = path.extname(coverFile);
    const destFilename = `cover-${Date.now()}-${Math.round(Math.random() * 1E9)}${extension}`;
    const destPath = path.join(APP_COVERS_PATH, destFilename);
    
    // Asegurar que existe el directorio de destino
    if (!fs.existsSync(APP_COVERS_PATH)) {
      fs.mkdirSync(APP_COVERS_PATH, { recursive: true });
    }
    
    // Copiar archivo
    fs.copyFileSync(sourcePath, destPath);
    console.log(`   ✅ Portada copiada: ${coverFile} → ${destFilename}`);
    
    return destFilename;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function migrarSeries() {
  let komgaDB;
  
  try {
    console.log('🚀 Iniciando migración desde Komga...\n');
    
    // Verificar que existe la BD de Komga
    if (!fs.existsSync(KOMGA_DB_PATH)) {
      throw new Error(`No se encontró la base de datos de Komga en: ${KOMGA_DB_PATH}`);
    }
    
    // Conectar a Komga
    komgaDB = await conectarKomgaDB();
    
    // Obtener series
    const series = await obtenerSeriesKomga(komgaDB);
    
    if (series.length === 0) {
      console.log('⚠️  No se encontraron series en Komga');
      return;
    }
    
    console.log('\n📥 Iniciando importación...\n');
    
    let importados = 0;
    let errores = 0;
    
    for (const serie of series) {
      try {
        console.log(`\n📖 Procesando: ${serie.name}`);
        
        // Determinar estado
        const estado = determinarEstado(serie);
        console.log(`   Estado: ${estado}`);
        
        // Determinar capítulo actual (número de libros leídos)
        const capituloActual = serie.books_read_count || null;
        if (capituloActual) {
          console.log(`   Capítulos leídos: ${capituloActual}/${serie.book_count}`);
        }
        
        // Copiar portada
        const portadaUrl = await copiarPortada(serie.url, serie.name);
        
        // Crear manga en nuestra BD
        const manga = await prisma.manga.create({
          data: {
            titulo: serie.name,
            tipo: 'manga', // Por defecto
            estadoLectura: estado,
            capituloActual: capituloActual,
            calificacion: null,
            comentarioOpinion: `Importado desde Komga - ${serie.book_count} volúmenes totales`,
            portadaUrl: portadaUrl,
          }
        });
        
        console.log(`   ✅ Importado con ID: ${manga.id}`);
        importados++;
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errores++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(50));
    console.log(`✅ Series importadas: ${importados}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📚 Total procesadas: ${series.length}`);
    console.log('='.repeat(50) + '\n');
    
    console.log('✨ Migración completada!');
    
  } catch (error) {
    console.error('❌ Error fatal en la migración:', error);
    process.exit(1);
  } finally {
    if (komgaDB) {
      komgaDB.close();
    }
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migrarSeries();
