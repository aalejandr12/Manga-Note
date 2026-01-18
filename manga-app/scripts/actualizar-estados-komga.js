// Script para actualizar estados de lectura desde la API de Komga
// Uso: node scripts/actualizar-estados-komga.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const https = require('https');
const http = require('http');

const prisma = new PrismaClient();

// Configuración de Komga API
const KOMGA_URL = process.env.KOMGA_URL || 'http://host.docker.internal:28080';
const KOMGA_USER = process.env.KOMGA_USER || 'ale_alejandro12@hotmail.com';
const KOMGA_PASS = process.env.KOMGA_PASS || 'Santafe.2019';

// Mapeo de estados Komga → App
function determinarEstadoDesdeKomga(serie) {
  const totalBooks = serie.booksCount || 0;
  const readCount = serie.booksReadCount || 0;
  const inProgressCount = serie.booksInProgressCount || 0;
  const unreadCount = serie.booksUnreadCount || 0;

  // Si todos los libros están leídos
  if (totalBooks > 0 && readCount === totalBooks) {
    return 'terminado';
  }

  // Si tiene libros en progreso o algunos leídos pero no todos
  if (readCount > 0 || inProgressCount > 0) {
    return 'leyendo';
  }

  // Si no ha leído nada
  return 'no_empezado';
}

async function obtenerSeriesKomga() {
  return new Promise((resolve, reject) => {
    try {
      const auth = Buffer.from(`${KOMGA_USER}:${KOMGA_PASS}`).toString('base64');
      const url = new URL(`${KOMGA_URL}/api/v1/series?unpaged=true`);
      
      console.log(`🔗 Conectando a Komga API: ${KOMGA_URL}`);
      
      const protocol = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      };

      const req = protocol.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Error HTTP: ${res.statusCode} ${res.statusMessage}`));
            return;
          }

          try {
            const jsonData = JSON.parse(data);
            console.log(`✅ Obtenidas ${jsonData.content.length} series de Komga\n`);
            resolve(jsonData.content);
          } catch (error) {
            reject(new Error(`Error parseando JSON: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Error de conexión: ${error.message}`));
      });

      req.end();
      
    } catch (error) {
      console.error('❌ Error conectando a Komga:', error.message);
      reject(error);
    }
  });
}

async function actualizarEstados() {
  try {
    console.log('🚀 Iniciando actualización de estados desde Komga...\n');

    // Obtener series de Komga
    const seriesKomga = await obtenerSeriesKomga();

    // Obtener mangas de nuestra BD
    const mangas = await prisma.manga.findMany({
      select: {
        id: true,
        titulo: true,
        estadoLectura: true,
        capituloActual: true
      }
    });

    console.log(`📚 Encontrados ${mangas.length} mangas en la base de datos local\n`);
    console.log('📥 Actualizando estados...\n');

    let actualizados = 0;
    let noEncontrados = 0;
    let sinCambios = 0;

    for (const manga of mangas) {
      try {
        // Buscar serie en Komga por nombre (normalizado)
        const serieKomga = seriesKomga.find(s => 
          s.name.toLowerCase().trim() === manga.titulo.toLowerCase().trim()
        );

        if (!serieKomga) {
          console.log(`⚠️  ${manga.titulo}: No encontrado en Komga`);
          noEncontrados++;
          continue;
        }

        // Determinar nuevo estado
        const nuevoEstado = determinarEstadoDesdeKomga(serieKomga);
        const nuevoCapitulo = serieKomga.booksReadCount || 0;

        // Ver si hay cambios
        const cambioEstado = manga.estadoLectura !== nuevoEstado;
        const cambioCapitulo = manga.capituloActual !== nuevoCapitulo;

        if (!cambioEstado && !cambioCapitulo) {
          console.log(`   ${manga.titulo}: Sin cambios`);
          sinCambios++;
          continue;
        }

        // Actualizar en BD
        await prisma.manga.update({
          where: { id: manga.id },
          data: {
            estadoLectura: nuevoEstado,
            capituloActual: nuevoCapitulo > 0 ? nuevoCapitulo : null
          }
        });

        console.log(`✅ ${manga.titulo}:`);
        if (cambioEstado) {
          console.log(`   Estado: ${manga.estadoLectura} → ${nuevoEstado}`);
        }
        if (cambioCapitulo) {
          console.log(`   Capítulos: ${manga.capituloActual || 0} → ${nuevoCapitulo}`);
        }
        console.log(`   (${serieKomga.booksReadCount}/${serieKomga.booksCount} volúmenes leídos)`);

        actualizados++;

      } catch (error) {
        console.error(`❌ Error procesando "${manga.titulo}":`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE ACTUALIZACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Mangas actualizados: ${actualizados}`);
    console.log(`➖ Sin cambios: ${sinCambios}`);
    console.log(`⚠️  No encontrados en Komga: ${noEncontrados}`);
    console.log(`📚 Total procesados: ${mangas.length}`);
    console.log('='.repeat(60) + '\n');

    console.log('✨ Actualización completada!');

  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
actualizarEstados();
