#!/usr/bin/env node

/**
 * Script para corregir manualmente los volúmenes de "El Amor Es Una Ilusión"
 */

const Database = require('./server/database');

async function fixVolumes() {
  const db = new Database('./database/manga_library.db');
  await db.ready;
  
  console.log('\n🔧 Corrigiendo volúmenes de "El Amor Es Una Ilusión"...\n');
  
  // Obtener todos los volúmenes de la serie
  const volumes = await db._all(
    `SELECT v.* FROM volumes v
     JOIN series s ON v.series_id = s.id
     WHERE s.normalized_title LIKE '%amor%ilusion%'
     ORDER BY v.id`
  );
  
  if (volumes.length === 0) {
    console.log('❌ No se encontraron volúmenes');
    await db.close();
    return;
  }
  
  console.log(`📚 Encontrados ${volumes.length} volúmenes\n`);
  
  // Mapeo manual basado en los nombres de archivo
  const corrections = [
    { id: 7, title: 'Capítulos 1-14', chapter_start: 1, chapter_end: 14 },
    { id: 8, title: 'Capítulos 15-22', chapter_start: 15, chapter_end: 22 },
    { id: 9, title: 'Capítulo 24', chapter_start: 24, chapter_end: 24, chapter_number: 24 },
    { id: 10, title: 'Capítulo 23', chapter_start: 23, chapter_end: 23, chapter_number: 23 }
  ];
  
  for (const vol of volumes) {
    const correction = corrections.find(c => c.id === vol.id);
    
    if (correction) {
      console.log(`📖 Volumen ${vol.id}:`);
      console.log(`   Antes: "${vol.title}"`);
      console.log(`   Después: "${correction.title}"`);
      
      await db._run(
        `UPDATE volumes 
         SET title = ?,
             chapter_number = ?,
             chapter_start = ?,
             chapter_end = ?
         WHERE id = ?`,
        [
          correction.title,
          correction.chapter_number || null,
          correction.chapter_start,
          correction.chapter_end,
          vol.id
        ]
      );
      
      console.log(`   ✅ Actualizado\n`);
    } else {
      console.log(`⚠️  Volumen ${vol.id}: Sin corrección definida\n`);
    }
  }
  
  db._save();
  
  // Mostrar resultado final ordenado
  const finalVolumes = await db._all(
    `SELECT * FROM volumes 
     WHERE series_id = (SELECT id FROM series WHERE normalized_title LIKE '%amor%ilusion%')
     ORDER BY chapter_start, chapter_number, id`
  );
  
  console.log('✅ Resultado final:\n');
  console.log('📖 El Amor Es Una Ilusión! Superstar:');
  finalVolumes.forEach((v, i) => {
    console.log(`   ${i + 1}. ${v.title}`);
  });
  
  console.log('');
  await db.close();
}

fixVolumes().catch(error => {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
