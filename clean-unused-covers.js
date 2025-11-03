const fs = require('fs').promises;
const path = require('path');
const Database = require('./server/database');

async function cleanUnusedCovers() {
  console.log('🧹 Limpiando portadas no utilizadas...\n');
  
  const db = new Database();
  await db._init();
  
  // Obtener todas las series y sus portadas
  const series = await db.getAllSeries();
  const usedCovers = new Set();
  
  series.forEach(s => {
    if (s.cover_image && s.cover_source === 'user') {
      usedCovers.add(s.cover_image);
    }
  });
  
  console.log(`📊 Portadas en uso: ${usedCovers.size}`);
  
  // Listar archivos en covers
  const coversDir = './uploads/covers';
  try {
    const files = await fs.readdir(coversDir);
    let deletedCount = 0;
    let deletedSize = 0;
    
    for (const file of files) {
      const filePath = path.join(coversDir, file);
      const fullPath = path.join('uploads/covers', file);
      
      // Si el archivo no está en uso, eliminarlo
      if (!usedCovers.has(fullPath)) {
        const stats = await fs.stat(filePath);
        await fs.unlink(filePath);
        deletedCount++;
        deletedSize += stats.size;
        console.log(`  ✓ Eliminado: ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      }
    }
    
    console.log(`\n✅ Limpieza completada:`);
    console.log(`   - Archivos eliminados: ${deletedCount}`);
    console.log(`   - Espacio liberado: ${(deletedSize / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error('❌ Error al limpiar portadas:', error);
  }
  
  process.exit(0);
}

cleanUnusedCovers();
