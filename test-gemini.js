// test-gemini.js - Script de prueba para Gemini API
require('dotenv').config();
const GeminiServiceRotation = require('./server/services/gemini-service-rotation');

async function testGemini() {
  console.log('🧪 PRUEBA DE GEMINI API\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Recopilar todas las API keys
  const apiKeys = [];
  for (let i = 1; i <= 5; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim() && key !== 'tu_api_key_aqui') {
      apiKeys.push(key.trim());
    }
  }
  
  if (apiKeys.length === 0) {
    console.error('❌ No hay API keys configuradas en .env');
    console.log('\nAgrega tus API keys en el archivo .env:');
    console.log('GEMINI_API_KEY_1=tu_clave_aqui');
    console.log('GEMINI_API_KEY_2=tu_clave_aqui (opcional)');
    process.exit(1);
  }
  
  console.log(`✓ Encontradas ${apiKeys.length} API key(s)\n`);
  
  try {
    const gemini = new GeminiServiceRotation(apiKeys);
    console.log('✓ Servicio Gemini inicializado\n');
    
    // Prueba 1: Análisis de nombre simple
    console.log('📝 PRUEBA 1: Nombre simple');
    console.log('Archivo: "Given Vol 1.pdf"');
    const test1 = await gemini.analyzePDFFilename('Given Vol 1.pdf');
    console.log('Resultado:', JSON.stringify(test1, null, 2));
    console.log('\n');
    
    // Prueba 2: Nombre con rango de capítulos
    console.log('📝 PRUEBA 2: Rango de capítulos');
    console.log('Archivo: "Diferencia de tamaño (1-30).pdf"');
    const test2 = await gemini.analyzePDFFilename('Diferencia de tamaño (1-30).pdf');
    console.log('Resultado:', JSON.stringify(test2, null, 2));
    console.log('\n');
    
    // Prueba 3: Nombre con código
    console.log('📝 PRUEBA 3: Con código de serie');
    console.log('Archivo: "[2030] Killing Stalking Cap 5.pdf"');
    const test3 = await gemini.analyzePDFFilename('[2030] Killing Stalking Cap 5.pdf');
    console.log('Resultado:', JSON.stringify(test3, null, 2));
    console.log('\n');
    
    // Prueba 4: Obtener metadata
    console.log('📝 PRUEBA 4: Metadata completa');
    console.log('Serie: "Given"');
    const test4 = await gemini.getSeriesMetadata('Given', 'yaoi');
    console.log('Resultado:', JSON.stringify(test4, null, 2));
    console.log('\n');
    
    // Verificar códigos únicos
    console.log('📝 PRUEBA 5: Códigos generados');
    const code1 = gemini.generateSeriesCode('Diferencia de tamaño');
    const code2 = gemini.generateSeriesCode('Diferencia de tamaño');
    const code3 = gemini.generateSeriesCode('Given');
    console.log('Diferencia de tamaño:', code1);
    console.log('Diferencia de tamaño (otra vez):', code2);
    console.log('Given:', code3);
    console.log('¿Códigos consistentes?', code1 === code2 ? '✓ Sí' : '✗ No');
    console.log('\n');
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ ERROR EN LA PRUEBA:');
    console.error(error.message);
    console.error('\nDetalles:', error);
    process.exit(1);
  }
}

// Ejecutar pruebas
testGemini();
