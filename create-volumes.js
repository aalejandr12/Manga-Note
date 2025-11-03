#!/usr/bin/env node

/**
 * Script para crear volúmenes manualmente para los PDFs huérfanos
 */

const Database = require('./server/database');
const path = require('path');
const fs = require('fs');

async function createVolumes() {
  const db = new Database('./database/manga_library.db');
  await db.ready;
  
  console.log('\n📦 Creando volúmenes para PDFs...\n');
  
  // Buscar la serie de "El Amor Es Una Ilusión"
  const amorSeries = await db._get(
    `SELECT * FROM series WHERE normalized_title LIKE '%amor%ilusi%'`
  );
  
  if (!amorSeries) {
    console.log('❌ No se encontró la serie');
    await db.close();
    return;
  }
  
  console.log(`✓ Serie encontrada: "${amorSeries.title}" (ID: ${amorSeries.id})\n`);
  
  // Listar archivos PDF
  const uploadsDir = './uploads';
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.pdf') && f.includes('Amor'));
  
  console.log(`📁 Archivos encontrados: ${files.length}\n`);
  
  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    
    // Extraer información del nombre
    let title = file.replace(/^\d+-\d+-/, '').replace(/\.pdf$/, '');
    let volume_number = null;
    let chapter_start = null;
    let chapter_end = null;
    
    // Detectar rangos: "1-14", "15-22"
    const rangeMatch = title.match(/(\d+)-(\d+)/);
    if (rangeMatch) {
      chapter_start = parseInt(rangeMatch[1]);
      chapter_end = parseInt(rangeMatch[2]);
      console.log(`📖 ${file}`);
      console.log(`   Capítulos ${chapter_start}-${chapter_end}`);
    } else {
      // Detectar capítulo individual: "23¡", "24¡"
      const chapterMatch = title.match(/^(\d+)[¡!]/);
      if (chapterMatch) {
        chapter_start = parseInt(chapterMatch[1]);
        chapter_end = chapter_start;
        console.log(`📖 ${file}`);
        console.log(`   Capítulo ${chapter_start}`);
      }
    }
    
    // Verificar si ya existe
    const existing = await db._get(
      `SELECT id FROM volumes WHERE series_id = ? AND file_path = ?`,
      [amorSeries.id, filePath]
    );
    
    if (existing) {
      console.log(`   ⚠️  Ya existe, omitiendo\n`);
      continue;
    }
    
    // Crear volumen
    const volumeId = await db.createVolume({
      series_id: amorSeries.id,
      title: `Capítulos ${chapter_start}${chapter_end !== chapter_start ? `-${chapter_end}` : ''}`,
      volume_number: null,
      chapter_number: chapter_start === chapter_end ? chapter_start : null,
      chapter_start: chapter_start,
      chapter_end: chapter_end,
      file_path: filePath,
      file_size: stats.size,
      total_pages: null // Se calculará al abrir
    });
    
    console.log(`   ✓ Volumen creado (ID: ${volumeId})\n`);
  }
  
  db._save();
  
  // Mostrar resultado
  const volumes = await db.getVolumesBySeries(amorSeries.id);
  console.log(`✅ Total de volúmenes: ${volumes.length}`);
  console.log('\nVolúmenes:');
  volumes.forEach((v, i) => {
    const fileName = v.file_path.split('/').pop();
    const chapters = v.chapter_start === v.chapter_end ? 
      `Cap ${v.chapter_start}` : 
      `Cap ${v.chapter_start}-${v.chapter_end}`;
    console.log(`  ${i + 1}. ${chapters}: ${fileName}`);
  });
  
  console.log('');
  await db.close();
}

createVolumes().catch(error => {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
