#!/usr/bin/env node

/**
 * Script simple para agrupar series de "El Amor Es Una Ilusión"
 */

const Database = require('./server/database');

async function fix() {
  const db = new Database('./database/manga_library.db');
  await db.ready;
  
  console.log('\n📚 Corrigiendo series de "El Amor Es Una Ilusión"...\n');
  
  // Obtener todas las series
  const allSeries = await db.getAllSeries();
  
  // Filtrar series relacionadas
  const amorSeries = allSeries.filter(s => 
    s.title && (
      s.title.includes('Amor') || 
      s.title.includes('amor') ||
      s.title.includes('Ilusi') ||
      s.title.includes('ilusi')
    )
  );
  
  if (amorSeries.length === 0) {
    console.log('❌ No se encontraron series para corregir');
    await db.close();
    return;
  }
  
  console.log(`✓ Encontradas ${amorSeries.length} series:`);
  amorSeries.forEach(s => {
    console.log(`  - ID ${s.id}: "${s.title}" [${s.series_code}] - ${s.volume_count} volúmenes`);
  });
  
  if (amorSeries.length === 1) {
    console.log('\n✓ Solo hay una serie, no se necesita agrupar');
    await db.close();
    return;
  }
  
  // Usar la primera serie como principal
  const mainSeries = amorSeries[0];
  console.log(`\n🎯 Serie principal: ID ${mainSeries.id} - "${mainSeries.title}"`);
  console.log(`📝 Título correcto: "El Amor Es Una Ilusión! Superstar"`);
  console.log(`🔢 Código: ${mainSeries.series_code}\n`);
  
  // Mover volúmenes de otras series a la principal
  for (const series of amorSeries) {
    if (series.id !== mainSeries.id) {
      console.log(`📦 Procesando serie ${series.id}...`);
      
      if (series.volume_count > 0) {
        console.log(`   Moviendo ${series.volume_count} volumen(es) a serie ${mainSeries.id}...`);
        await db._run(
          'UPDATE volumes SET series_id = ? WHERE series_id = ?',
          [mainSeries.id, series.id]
        );
      }
      
      console.log(`   Eliminando serie ${series.id}...`);
      await db._run('DELETE FROM series WHERE id = ?', [series.id]);
    }
  }
  
  // Actualizar título de la serie principal
  console.log(`\n✏️  Actualizando título de serie ${mainSeries.id}...`);
  const correctTitle = "El Amor Es Una Ilusión! Superstar";
  const normalizedTitle = correctTitle.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9\s]/g, ' ') // Solo letras, números y espacios
    .replace(/\s+/g, ' ') // Normalizar espacios
    .trim();
  
  await db._run(
    `UPDATE series 
     SET title = ?, normalized_title = ?
     WHERE id = ?`,
    [correctTitle, normalizedTitle, mainSeries.id]
  );
  
  db._save();
  
  console.log('\n✅ Corrección completada!\n');
  
  // Mostrar resultado
  const finalSeries = await db.getSeries(mainSeries.id);
  const volumes = await db.getVolumesBySeries(mainSeries.id);
  
  console.log('📖 Resultado final:');
  console.log(`   Título: ${finalSeries.title}`);
  console.log(`   Código: ${finalSeries.series_code}`);
  console.log(`   Volúmenes: ${volumes.length}`);
  
  if (volumes.length > 0) {
    console.log('\n   Archivos:');
    volumes.forEach((v, i) => {
      const fileName = v.file_path.split('/').pop();
      console.log(`     ${i + 1}. ${fileName}`);
    });
  }
  
  console.log('');
  await db.close();
}

fix().catch(error => {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
