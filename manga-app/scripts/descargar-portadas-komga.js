const { PrismaClient } = require('@prisma/client');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Configuración de Komga
// Usar IP del host directamente
const KOMGA_URL = 'http://10.0.0.1:28080';
const KOMGA_USER = 'aalejandro12.2000@gmail.com';
const KOMGA_PASS = 'SORA_VENTUS12';
const AUTH = Buffer.from(`${KOMGA_USER}:${KOMGA_PASS}`).toString('base64');

// Directorio de portadas de la app
const APP_COVERS_PATH = path.join(__dirname, '../data/covers');

// Asegurar que existe el directorio
if (!fs.existsSync(APP_COVERS_PATH)) {
  fs.mkdirSync(APP_COVERS_PATH, { recursive: true });
}

// Función para descargar una imagen
function descargarImagen(url, rutaDestino) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Authorization': `Basic ${AUTH}`
      }
    };

    http.get(url, options, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Error HTTP: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(rutaDestino);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(rutaDestino, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

// Función para obtener todas las series de Komga
async function obtenerSeriesKomga() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '10.0.0.1', // IP del host
      port: 28080,
      path: '/api/v1/series?size=1000',
      headers: {
        'Authorization': `Basic ${AUTH}`
      }
    };

    http.get(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.content);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// Función principal
async function descargarPortadas() {
  try {
    console.log('🚀 Iniciando descarga de portadas desde Komga...\n');

    // 1. Obtener todas las series de Komga
    console.log('📚 Obteniendo series de Komga...');
    const seriesKomga = await obtenerSeriesKomga();
    console.log(`   ✅ ${seriesKomga.length} series encontradas\n`);

    // 2. Obtener todos los mangas de nuestra base de datos
    console.log('📖 Obteniendo mangas de la base de datos...');
    const mangas = await prisma.manga.findMany({
      where: {
        comentarioOpinion: {
          contains: 'Importado desde Komga'
        }
      }
    });
    console.log(`   ✅ ${mangas.length} mangas importados de Komga\n`);

    // 3. Crear un mapa de series por nombre
    const seriesMap = new Map();
    seriesKomga.forEach(serie => {
      seriesMap.set(serie.name.toLowerCase(), serie);
    });

    // 4. Descargar portadas
    let descargadas = 0;
    let errores = 0;
    let yaExisten = 0;

    for (const manga of mangas) {
      const nombreBusqueda = manga.titulo.toLowerCase();
      const serie = seriesMap.get(nombreBusqueda);

      if (!serie) {
        console.log(`⚠️  No se encontró en Komga: "${manga.titulo}"`);
        errores++;
        continue;
      }

      // Si ya tiene portada, saltar
      if (manga.portadaUrl) {
        yaExisten++;
        continue;
      }

      try {
        // Generar nombre único para la portada
        const extension = '.jpg';
        const nombreArchivo = `cover-${Date.now()}-${Math.round(Math.random() * 1E9)}${extension}`;
        const rutaDestino = path.join(APP_COVERS_PATH, nombreArchivo);

        // Descargar portada
        const urlPortada = `${KOMGA_URL}/api/v1/series/${serie.id}/thumbnail`;
        await descargarImagen(urlPortada, rutaDestino);

        // Actualizar en la base de datos
        await prisma.manga.update({
          where: { id: manga.id },
          data: { portadaUrl: nombreArchivo }
        });

        console.log(`✅ ${manga.titulo}`);
        descargadas++;

        // Pequeña pausa para no saturar
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`❌ Error con "${manga.titulo}": ${error.message}`);
        errores++;
      }
    }

    console.log('\n==================================================');
    console.log('📊 RESUMEN DE DESCARGA');
    console.log('==================================================');
    console.log(`✅ Portadas descargadas: ${descargadas}`);
    console.log(`📁 Ya existían: ${yaExisten}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📚 Total procesadas: ${mangas.length}`);
    console.log('==================================================\n');

    console.log('✨ ¡Descarga completada!');

  } catch (error) {
    console.error('❌ Error fatal:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
descargarPortadas();
