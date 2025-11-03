#!/usr/bin/env node

/**
 * Script para corregir y agrupar series manualmente
 * Uso: node fix-series.js
 */

const Database = require('./server/database');
const GeminiService = require('./server/services/gemini-service');

// Simular una API key para usar las funciones de normalización
const geminiService = new GeminiService('dummy-key-for-functions');

const db = new Database('./database/manga_library.db');

async function fixSeries() {
  console.log('🔧 Iniciando corrección de series...\n');
  
  // Obtener todas las series
  const allSeries = await db.getAllSeries();
  
  console.log(`📚 Series encontradas: ${allSeries.length}\n`);
  
  // Mostrar series actuales
  allSeries.forEach(series => {
    console.log(`ID: ${series.id}`);
    console.log(`Título: ${series.title}`);
    console.log(`Código: ${series.series_code}`);
    console.log(`Volúmenes: ${series.volume_count}`);
    console.log('---');
  });
  
  // Casos para agrupar manualmente
  console.log('\n🔍 Buscando series de "El Amor Es Una Ilusión"...\n');
  
  const amorIlusionSeries = allSeries.filter(s => 
    s.normalized_title.includes('amor') && 
    s.normalized_title.includes('ilusion')
  );
  
  if (amorIlusionSeries.length > 1) {
    console.log(`✓ Encontradas ${amorIlusionSeries.length} series para agrupar:`);
    amorIlusionSeries.forEach(s => {
      console.log(`  - ID ${s.id}: "${s.title}" [Código: ${s.series_code}]`);
    });
    
    // Usar el primer series_code como principal
    const mainCode = amorIlusionSeries[0].series_code;
    const mainTitle = "El Amor Es Una Ilusión! Superstar";
    
    console.log(`\n🎯 Agrupando todos bajo código: ${mainCode}`);
    console.log(`📝 Título corregido: ${mainTitle}\n`);
    
    // Actualizar todos los series_code a ser iguales
    for (const series of amorIlusionSeries) {
      // Primero obtener los volúmenes de esta serie
      const stmt = db.db.prepare('SELECT * FROM volumes WHERE series_id = ?');
      const volumes = stmt.all(series.id);
      stmt.finalize();
      
      if (volumes.length === 0) {
        console.log(`⚠️  Serie ${series.id} no tiene volúmenes, eliminando...`);
        const deleteStmt = db.db.prepare('DELETE FROM series WHERE id = ?');
        deleteStmt.run(series.id);
        deleteStmt.finalize();
      } else {
        console.log(`📦 Serie ${series.id} tiene ${volumes.length} volumen(es)`);
        
        // Si no es la serie principal, mover volúmenes
        if (series.id !== amorIlusionSeries[0].id) {
          console.log(`   Moviendo volúmenes a serie principal ${amorIlusionSeries[0].id}...`);
          const moveStmt = db.db.prepare('UPDATE volumes SET series_id = ? WHERE series_id = ?');
          moveStmt.run(amorIlusionSeries[0].id, series.id);
          moveStmt.finalize();
          
          // Eliminar serie duplicada
          const deleteStmt = db.db.prepare('DELETE FROM series WHERE id = ?');
          deleteStmt.run(series.id);
          deleteStmt.finalize();
          console.log(`   ✓ Serie ${series.id} eliminada y volúmenes movidos`);
        }
      }
    }
    
    // Actualizar título y series_code de la serie principal
    const updateStmt = db.db.prepare(`
      UPDATE series 
      SET title = ?, series_code = ?, normalized_title = ?
      WHERE id = ?
    `);
    updateStmt.run(
      mainTitle,
      mainCode,
      geminiService.normalizeTitle(mainTitle),
      amorIlusionSeries[0].id
    );
    updateStmt.finalize();
    
    console.log(`\n✨ Series agrupadas correctamente!`);
    
    // Mostrar volúmenes de la serie agrupada
    const finalStmt = db.db.prepare('SELECT * FROM volumes WHERE series_id = ? ORDER BY id');
    const finalVolumes = finalStmt.all(amorIlusionSeries[0].id);
    finalStmt.finalize();
    
    console.log(`\n📚 Volúmenes en la serie agrupada:`);
    finalVolumes.forEach(v => {
      console.log(`  - ${v.file_name}`);
    });
  } else {
    console.log('ℹ️  No se encontraron series para agrupar');
  }
  
  console.log('\n✓ Proceso completado');
  
  // Cerrar base de datos
  await db.close();
}

// Ejecutar
fixSeries().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
