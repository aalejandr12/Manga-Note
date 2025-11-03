#!/usr/bin/env node

/**
 * Script para inspeccionar y corregir series con problemas de codificación
 */

const Database = require('./server/database');

async function inspect() {
  const db = new Database('./database/manga_library.db');
  await db.ready; // Esperar a que la DB esté lista
  
  console.log('📊 Inspeccionando base de datos...\n');
  
  // Consultar series directamente
  const stmt = db.db.prepare('SELECT * FROM series ORDER BY id');
  const series = stmt.all();
  stmt.finalize();
  
  console.log(`Total series: ${series.length}\n`);
  
  for (const s of series) {
    console.log(`\n═══════════════════════════════════════`);
    console.log(`ID: ${s.id}`);
    console.log(`Título: ${s.title}`);
    console.log(`Título normalizado: ${s.normalized_title}`);
    console.log(`Código serie: ${s.series_code}`);
    
    // Buscar volúmenes
    const volStmt = db.db.prepare('SELECT id, file_name, volume_number, chapter_start, chapter_end FROM volumes WHERE series_id = ?');
    const volumes = volStmt.all(s.id);
    volStmt.finalize();
    
    console.log(`Volúmenes: ${volumes.length}`);
    
    if (volumes.length > 0) {
      volumes.forEach(v => {
        console.log(`  - Vol ${v.volume_number || 'N/A'}, Ch ${v.chapter_start || 'N/A'}-${v.chapter_end || 'N/A'}: ${v.file_name}`);
      });
    }
  }
  
  console.log('\n\n🔧 Correcciones necesarias:');
  console.log('═══════════════════════════════════════\n');
  
  // Encontrar series de "El Amor es Una Ilusión"
  const amorSeries = series.filter(s => 
    s.title.includes('Amor') || s.title.includes('amor')
  );
  
  if (amorSeries.length > 0) {
    console.log(`✓ Encontradas ${amorSeries.length} series de "El Amor Es Una Ilusión":`);
    
    for (const s of amorSeries) {
      const volStmt = db.db.prepare('SELECT * FROM volumes WHERE series_id = ?');
      const volumes = volStmt.all(s.id);
      volStmt.finalize();
      
      console.log(`\n  ID ${s.id}: ${s.title}`);
      console.log(`    Código: ${s.series_code}`);
      console.log(`    Volúmenes: ${volumes.length}`);
      
      if (volumes.length === 0) {
        console.log(`    ⚠️  Serie vacía - candidata para eliminar`);
      }
    }
    
    // Proponer agrupación
    console.log('\n📝 Plan de corrección:');
    console.log('  1. Título principal: "El Amor Es Una Ilusión! Superstar"');
    console.log(`  2. Código principal: ${amorSeries[0].series_code}`);
    console.log(`  3. Agrupar ${amorSeries.length} series bajo ID ${amorSeries[0].id}`);
    
    // Ejecutar corrección
    console.log('\n🚀 Ejecutando corrección...\n');
    
    const mainId = amorSeries[0].id;
    const mainCode = amorSeries[0].series_code;
    const correctTitle = "El Amor Es Una Ilusión! Superstar";
    
    // Mover todos los volúmenes a la serie principal
    for (const s of amorSeries) {
      if (s.id !== mainId) {
        const volStmt = db.db.prepare('SELECT COUNT(*) as count FROM volumes WHERE series_id = ?');
        const result = volStmt.get(s.id);
        volStmt.finalize();
        
        if (result.count > 0) {
          console.log(`  Moviendo ${result.count} volumen(es) de serie ${s.id} a ${mainId}...`);
          const moveStmt = db.db.prepare('UPDATE volumes SET series_id = ? WHERE series_id = ?');
          moveStmt.run(mainId, s.id);
          moveStmt.finalize();
        }
        
        console.log(`  Eliminando serie ${s.id}...`);
        const deleteStmt = db.db.prepare('DELETE FROM series WHERE id = ?');
        deleteStmt.run(s.id);
        deleteStmt.finalize();
      }
    }
    
    // Actualizar título y código de la serie principal
    console.log(`  Actualizando título de serie ${mainId}...`);
    const updateStmt = db.db.prepare(`
      UPDATE series 
      SET title = ?, 
          normalized_title = ?,
          series_code = ?
      WHERE id = ?
    `);
    updateStmt.run(
      correctTitle,
      correctTitle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(),
      mainCode,
      mainId
    );
    updateStmt.finalize();
    
    console.log('\n✅ Corrección completada!');
    
    // Mostrar resultado final
    const finalStmt = db.db.prepare('SELECT * FROM series WHERE id = ?');
    const finalSeries = finalStmt.get(mainId);
    finalStmt.finalize();
    
    const finalVolStmt = db.db.prepare('SELECT * FROM volumes WHERE series_id = ? ORDER BY id');
    const finalVolumes = finalVolStmt.all(mainId);
    finalVolStmt.finalize();
    
    console.log('\n📚 Resultado final:');
    console.log(`  Título: ${finalSeries.title}`);
    console.log(`  Código: ${finalSeries.series_code}`);
    console.log(`  Volúmenes: ${finalVolumes.length}`);
    finalVolumes.forEach((v, i) => {
      console.log(`    ${i+1}. ${v.file_name}`);
    });
  } else {
    console.log('❌ No se encontraron series para corregir');
  }
  
  await db.close();
}

inspect().catch(console.error);
