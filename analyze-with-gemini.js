#!/usr/bin/env node

/**
 * Script para analizar PDFs con Gemini y corregir información de capítulos
 */

require('dotenv').config();
const Database = require('./server/database');
const GeminiService = require('./server/services/gemini-service');
const path = require('path');

async function analyzeAndFix() {
  const db = new Database('./database/manga_library.db');
  await db.ready;
  
  // Verificar API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'tu_api_key_aqui') {
    console.log('❌ No hay API key de Gemini configurada');
    console.log('   Configura GEMINI_API_KEY en el archivo .env');
    await db.close();
    return;
  }
  
  const gemini = new GeminiService(apiKey);
  
  console.log('\n🤖 Analizando volúmenes con Gemini AI...\n');
  
  // Obtener volúmenes con información incompleta
  const volumes = await db._all(
    `SELECT * FROM volumes WHERE chapter_start IS NULL OR chapter_end IS NULL OR title LIKE '%null%'`
  );
  
  if (volumes.length === 0) {
    console.log('✓ Todos los volúmenes tienen información completa');
    await db.close();
    return;
  }
  
  console.log(`📚 Encontrados ${volumes.length} volúmenes para analizar:\n`);
  
  for (const volume of volumes) {
    const fileName = path.basename(volume.file_path);
    console.log(`📄 Analizando: ${fileName}`);
    
    try {
      // Analizar el nombre del archivo con Gemini
      const analysis = await gemini.analyzePDFFilename(fileName);
      
      console.log(`   🔍 Resultado:`);
      console.log(`      Título: ${analysis.title}`);
      
      if (analysis.chapter) {
        console.log(`      Capítulo: ${analysis.chapter}`);
      } else if (analysis.chapter_start && analysis.chapter_end) {
        console.log(`      Capítulos: ${analysis.chapter_start}-${analysis.chapter_end}`);
      } else if (analysis.volume) {
        console.log(`      Volumen: ${analysis.volume}`);
      }
      
      // Determinar el título del volumen
      let volumeTitle;
      if (analysis.chapter) {
        volumeTitle = `Capítulo ${analysis.chapter}`;
      } else if (analysis.chapter_start && analysis.chapter_end) {
        if (analysis.chapter_start === analysis.chapter_end) {
          volumeTitle = `Capítulo ${analysis.chapter_start}`;
        } else {
          volumeTitle = `Capítulos ${analysis.chapter_start}-${analysis.chapter_end}`;
        }
      } else if (analysis.volume) {
        volumeTitle = `Volumen ${analysis.volume}`;
      } else {
        volumeTitle = analysis.title;
      }
      
      // Actualizar el volumen
      await db._run(
        `UPDATE volumes 
         SET title = ?,
             chapter_number = ?,
             chapter_start = ?,
             chapter_end = ?,
             volume_number = ?
         WHERE id = ?`,
        [
          volumeTitle,
          analysis.chapter,
          analysis.chapter_start,
          analysis.chapter_end,
          analysis.volume,
          volume.id
        ]
      );
      
      console.log(`   ✅ Actualizado a: "${volumeTitle}"\n`);
      
      // Pequeña pausa para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      
      // Si Gemini falla, intentar análisis básico
      console.log(`   🔧 Intentando análisis básico...`);
      const basic = gemini.basicFilenameAnalysis(fileName);
      
      let volumeTitle;
      if (basic.chapter) {
        volumeTitle = `Capítulo ${basic.chapter}`;
      } else if (basic.chapter_start && basic.chapter_end) {
        if (basic.chapter_start === basic.chapter_end) {
          volumeTitle = `Capítulo ${basic.chapter_start}`;
        } else {
          volumeTitle = `Capítulos ${basic.chapter_start}-${basic.chapter_end}`;
        }
      } else if (basic.volume) {
        volumeTitle = `Volumen ${basic.volume}`;
      } else {
        volumeTitle = basic.title;
      }
      
      await db._run(
        `UPDATE volumes 
         SET title = ?,
             chapter_number = ?,
             chapter_start = ?,
             chapter_end = ?,
             volume_number = ?
         WHERE id = ?`,
        [
          volumeTitle,
          basic.chapter,
          basic.chapter_start,
          basic.chapter_end,
          basic.volume,
          volume.id
        ]
      );
      
      console.log(`   ✅ Actualizado (fallback) a: "${volumeTitle}"\n`);
    }
  }
  
  db._save();
  
  console.log('✨ Análisis completado!\n');
  
  // Mostrar resultado final
  const allVolumes = await db._all(
    `SELECT * FROM volumes WHERE series_id IN (
      SELECT DISTINCT series_id FROM volumes WHERE id IN (${volumes.map(v => v.id).join(',')})
    ) ORDER BY series_id, chapter_start, chapter_number`
  );
  
  console.log('📖 Volúmenes actualizados:');
  let currentSeries = null;
  for (const v of allVolumes) {
    if (v.series_id !== currentSeries) {
      const series = await db._get('SELECT title FROM series WHERE id = ?', [v.series_id]);
      console.log(`\n   ${series.title}:`);
      currentSeries = v.series_id;
    }
    console.log(`      ${v.title}`);
  }
  
  console.log('');
  await db.close();
}

analyzeAndFix().catch(error => {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
