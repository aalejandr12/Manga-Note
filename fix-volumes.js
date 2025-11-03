// fix-volumes.js - Script para arreglar volúmenes faltantes
require('dotenv').config();
const Database = require('./server/database');
const GeminiService = require('./server/services/gemini-service');
const fs = require('fs');
const path = require('path');

async function fixVolumes() {
  console.log('🔧 REPARANDO VOLÚMENES FALTANTES\n');
  
  const db = new Database('./database/manga_library.db');
  await db.ready;
  
  const gemini = new GeminiService(process.env.GEMINI_API_KEY);
  
  // Obtener todas las series
  const series = await db.getAllSeries();
  console.log(`📚 Series encontradas: ${series.length}\n`);
  
  for (const s of series) {
    console.log(`\n📖 Serie: ${s.title} [${s.series_code}]`);
    console.log(`   Volúmenes en DB: ${s.volume_count}`);
    
    // Buscar PDFs en uploads que correspondan a esta serie
    const uploadsDir = './uploads';
    const files = fs.readdirSync(uploadsDir);
    const pdfs = files.filter(f => f.endsWith('.pdf'));
    
    for (const pdf of pdfs) {
      const fullPath = path.join(uploadsDir, pdf);
      
      // Extraer nombre original (remover timestamp de multer)
      // Formato: 1762018522948-423683262-Off Track Crush.pdf
      const originalName = pdf.replace(/^\d+-\d+-/, '');
      console.log(`\n   🔍 Analizando: ${originalName}`);
      
      // Analizar nombre del archivo
      const analysis = await gemini.analyzePDFFilename(originalName);
      
      // Si el código coincide con esta serie
      if (analysis.series_code === s.series_code) {
        console.log(`      ✓ Coincide con la serie!`);
        console.log(`      Código: ${analysis.series_code}`);
        
        // Verificar si ya existe un volumen con este archivo
        const volumes = await db.getVolumesBySeries(s.id);
        const exists = volumes.some(v => v.file_path === fullPath);
        
        if (!exists) {
          console.log(`      ⚠️  Volumen NO existe en DB, creando...`);
          
          // Crear título del volumen
          let volumeTitle;
          if (analysis.chapter_start && analysis.chapter_end) {
            volumeTitle = `${analysis.title} - Cap. ${analysis.chapter_start}-${analysis.chapter_end}`;
          } else if (analysis.volume) {
            volumeTitle = `${analysis.title} - Vol. ${analysis.volume}`;
          } else if (analysis.chapter) {
            volumeTitle = `${analysis.title} - Cap. ${analysis.chapter}`;
          } else {
            volumeTitle = analysis.title;
          }
          
          // Obtener tamaño del archivo
          const stats = fs.statSync(fullPath);
          
          // Crear volumen
          const volumeId = await db.createVolume({
            series_id: s.id,
            title: volumeTitle,
            volume_number: analysis.volume,
            chapter_number: analysis.chapter,
            chapter_start: analysis.chapter_start,
            chapter_end: analysis.chapter_end,
            file_path: fullPath,
            file_size: stats.size,
            total_pages: 0
          });
          
          console.log(`      ✓ Volumen creado (ID: ${volumeId})`);
        } else {
          console.log(`      ✓ Volumen ya existe`);
        }
      }
    }
    
    // Actualizar conteo
    const finalVolumes = await db.getVolumesBySeries(s.id);
    await db.updateSeriesVolCount(s.id, finalVolumes.length);
    console.log(`   ✓ Conteo actualizado: ${finalVolumes.length} volúmenes`);
  }
  
  db.close();
  console.log('\n✅ REPARACIÓN COMPLETADA\n');
}

fixVolumes().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
