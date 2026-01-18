#!/usr/bin/env node

/**
 * Script de vigilancia automática de mangas
 * Consulta la API de webcomic-inme para detectar nuevos capítulos
 * y actualiza automáticamente la base de datos
 */

const { PrismaClient } = require('@prisma/client');
const http = require('http');
const https = require('https');

const prisma = new PrismaClient();
const WEBCOMIC_API_URL = 'http://10.0.2.1:8001/api/realtime/analyze';
const APP_URL = process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/upload` : 'http://127.0.0.1:3000/upload';

// Función para enviar notificación push
async function enviarNotificacionPush(manga, capitulosNuevos) {
  return new Promise((resolve, reject) => {
    // Crear título más informativo para iOS (que no muestra imágenes)
    const tituloNotificacion = capitulosNuevos === 1 
      ? `${manga.titulo} - Nuevo capítulo`
      : `${manga.titulo} - ${capitulosNuevos} nuevos capítulos`;
    
    const mensajeBody = capitulosNuevos === 1 
      ? '¡Ya está disponible para leer!'
      : `¡Ya están disponibles para leer!`;
    
    // Construir URL completa de la portada
    let iconUrl = undefined;
    if (manga.portadaUrl) {
      // Si la portada ya tiene la ruta completa, usarla directamente
      if (manga.portadaUrl.startsWith('/')) {
        iconUrl = `${APP_URL}${manga.portadaUrl}`;
      } else {
        // Si solo es el nombre del archivo, agregar la ruta de covers
        iconUrl = `${APP_URL}/data/covers/${manga.portadaUrl}`;
      }
    }
    
    const postData = JSON.stringify({
      title: tituloNotificacion,
      body: mensajeBody,
      url: `${APP_URL}/detalle.html?id=${manga.id}`,
      mangaId: manga.id,
      icon: iconUrl
    });
    
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/upload/api/push/send-notification',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve(jsonData);
        } catch (e) {
          resolve({ success: false });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('   ❌ Error enviando notificación push:', error.message);
      resolve({ success: false });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false });
    });
    
    req.write(postData);
    req.end();
  });
}

// Función para hacer POST request
function hacerRequestPOST(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 120000 // 120 segundos timeout (2 minutos)
    };
    
    const req = protocol.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve(jsonData);
        } catch (e) {
          reject(new Error(`Error parsing JSON: ${e.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.write(postData);
    req.end();
  });
}

// Función para consultar información de un manga
async function consultarManga(webSource, urlSource) {
  try {
    const payload = {
      web: webSource,
      url: urlSource
    };
    
    console.log(`  📡 Consultando API: ${webSource} - ${urlSource}`);
    const response = await hacerRequestPOST(WEBCOMIC_API_URL, payload);
    
    if (response.success && response.data) {
      // Obtener capítulos disponibles (puede ser "0" para mangas Coming Soon)
      const caps = response.data.Capitulos_disponible || response.data.capitulos_disponible;
      
      return {
        success: true,
        capitulosDisponibles: caps !== undefined && caps !== null ? caps : "0",
        proximoCapitulo: response.data.proximo_capitulo_estimado || response.data.proximo_cap || null
      };
    }
    
    return { success: false, error: response.message || 'Sin información' };
  } catch (error) {
    console.error(`  ❌ Error consultando API: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Función principal de vigilancia
async function vigilarMangas() {
  console.log('\n🔍 === INICIO DE VIGILANCIA DE MANGAS ===');
  console.log(`⏰ Fecha: ${new Date().toLocaleString('es-MX')}\n`);
  
  try {
    // Obtener todos los mangas con vigilancia activa
    const mangasVigilados = await prisma.manga.findMany({
      where: {
        vigilarManga: true,
        webSource: { not: null },
        urlSource: { not: null }
      },
      select: {
        id: true,
        titulo: true,
        webSource: true,
        urlSource: true,
        capitulosDisponibles: true,
        proximaFechaCapitulo: true,
        portadaUrl: true
      }
    });
    
    if (mangasVigilados.length === 0) {
      console.log('ℹ️  No hay mangas configurados para vigilancia automática');
      return;
    }
    
    console.log(`📚 Encontrados ${mangasVigilados.length} manga(s) para vigilar\n`);
    
    let actualizados = 0;
    let errores = 0;
    
    // Procesar cada manga
    for (const manga of mangasVigilados) {
      console.log(`\n📖 Procesando: ${manga.titulo}`);
      console.log(`   Web: ${manga.webSource}`);
      
      // Consultar API
      const resultado = await consultarManga(manga.webSource, manga.urlSource);
      
      if (resultado.success) {
        const capDisponibles = resultado.capitulosDisponibles;
        const proximaFecha = resultado.proximoCapitulo;
        
        console.log(`   ✅ Capítulos disponibles: ${capDisponibles || 'N/A'}`);
        console.log(`   📅 Próximo capítulo: ${proximaFecha || 'N/A'}`);
        
        // Detectar nuevos capítulos
        let tieneNuevosCapitulos = false;
        let capitulosNuevos = 0;
        
        if (manga.capitulosDisponibles && capDisponibles) {
          const numAnterior = parseInt(manga.capitulosDisponibles);
          const numNuevo = parseInt(capDisponibles);
          
          if (!isNaN(numAnterior) && !isNaN(numNuevo) && numNuevo > numAnterior) {
            capitulosNuevos = numNuevo - numAnterior;
            console.log(`   🆕 ¡NUEVOS CAPÍTULOS! ${numAnterior} → ${numNuevo} (+${capitulosNuevos})`);
            tieneNuevosCapitulos = true;
            
            // Enviar notificación push
            console.log(`   📬 Enviando notificación push...`);
            const resultadoNotif = await enviarNotificacionPush(manga, capitulosNuevos);
            if (resultadoNotif.success && resultadoNotif.sent > 0) {
              console.log(`   ✅ Notificación enviada a ${resultadoNotif.sent} dispositivo(s)`);
            }
          }
        }
        
        // Si los capítulos disponibles son null o vacíos, establecer en "0" para futuros checks
        const capitulosParaGuardar = capDisponibles || (capDisponibles === null ? "0" : capDisponibles);
        
        // Verificar si hay cambios reales (ignorar si pasa de null a "0")
        const cambioCapitulos = capitulosParaGuardar !== manga.capitulosDisponibles && 
                                !(manga.capitulosDisponibles === null && capitulosParaGuardar === "0");
        const cambioFecha = proximaFecha !== manga.proximaFechaCapitulo;
        
        // Si ambos valores en BD son NULL, forzar actualización aunque los nuevos valores sean "iguales"
        const necesitaInicializacion = manga.capitulosDisponibles === null && manga.proximaFechaCapitulo === null;
        
        const huboActualizacion = cambioCapitulos || cambioFecha || necesitaInicializacion;
        
        if (huboActualizacion) {
          if (necesitaInicializacion) {
            console.log(`   🔄 ¡INICIALIZACIÓN DE DATOS!`);
            console.log(`      Capítulos: NULL → ${capitulosParaGuardar || 'N/A'}`);
            console.log(`      Próxima fecha: NULL → ${proximaFecha || 'N/A'}`);
          } else {
            console.log(`   🆕 ¡ACTUALIZACIÓN DETECTADA!`);
            if (cambioCapitulos) {
              console.log(`      Capítulos: ${manga.capitulosDisponibles || 'N/A'} → ${capitulosParaGuardar || 'N/A'}`);
            }
            if (cambioFecha) {
              console.log(`      Próxima fecha: ${manga.proximaFechaCapitulo || 'N/A'} → ${proximaFecha || 'N/A'}`);
            }
          }
          
          // SOLO actualizar base de datos si HAY CAMBIOS
          try {
            await prisma.manga.update({
              where: { id: manga.id },
              data: {
                capitulosDisponibles: capitulosParaGuardar,
                proximaFechaCapitulo: proximaFecha,
                tieneNuevosCapitulos: tieneNuevosCapitulos,
                fechaActualizacion: new Date()
              }
            });
            
            console.log(`   💾 Base de datos actualizada`);
            actualizados++;
          } catch (updateError) {
            console.error(`   ❌ Error actualizando BD: ${updateError.message}`);
            errores++;
          }
        } else {
          console.log(`   ℹ️  Sin cambios - BD sin modificar (no se mueve en la lista)`);
        }
      } else {
        console.log(`   ⚠️  No se pudo obtener información: ${resultado.error}`);
        errores++;
      }
      
      // Pequeño delay entre requests para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Resumen
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN:');
    console.log(`   ✅ Mangas actualizados: ${actualizados}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   📚 Total procesados: ${mangasVigilados.length}`);
    console.log('='.repeat(50) + '\n');
    
  } catch (error) {
    console.error(`\n❌ ERROR GENERAL: ${error.message}`);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
if (require.main === module) {
  vigilarMangas()
    .then(() => {
      console.log('✅ Vigilancia completada\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { vigilarMangas };
