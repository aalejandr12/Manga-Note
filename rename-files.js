#!/usr/bin/env node

/**
 * Script para renombrar archivos PDF con nombres correctos y limpios
 */

const Database = require('./server/database');
const fs = require('fs');
const path = require('path');

async function renameFiles() {
  const db = new Database('./database/manga_library.db');
  await db.ready;
  
  console.log('\n📝 Renombrando archivos PDF...\n');
  
  // Obtener todos los volúmenes
  const volumes = await db._all(`
    SELECT v.*, s.title as series_title 
    FROM volumes v
    JOIN series s ON v.series_id = s.id
    ORDER BY s.id, v.chapter_start, v.chapter_number
  `);
  
  for (const vol of volumes) {
    const oldPath = vol.file_path;
    const oldFileName = path.basename(oldPath);
    
    // Generar nombre limpio basado en la serie y capítulos
    let newFileName;
    const seriesSlug = vol.series_title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9\s]/g, '') // Solo letras y números
      .replace(/\s+/g, '-') // Espacios a guiones
      .trim();
    
    if (vol.chapter_start && vol.chapter_end) {
      if (vol.chapter_start === vol.chapter_end) {
        newFileName = `${seriesSlug}-cap-${vol.chapter_start}.pdf`;
      } else {
        newFileName = `${seriesSlug}-cap-${vol.chapter_start}-${vol.chapter_end}.pdf`;
      }
    } else if (vol.volume_number) {
      newFileName = `${seriesSlug}-vol-${vol.volume_number}.pdf`;
    } else {
      // Si no tiene info, mantener nombre actual pero limpio
      newFileName = `${seriesSlug}-${vol.id}.pdf`;
    }
    
    const newPath = path.join('uploads', newFileName);
    
    // Solo renombrar si el nombre cambió
    if (oldFileName !== newFileName) {
      console.log(`📄 ${oldFileName}`);
      console.log(`   → ${newFileName}`);
      
      try {
        // Verificar que el archivo existe
        if (fs.existsSync(oldPath)) {
          // Renombrar archivo
          fs.renameSync(oldPath, newPath);
          
          // Actualizar base de datos
          await db._run(
            'UPDATE volumes SET file_path = ? WHERE id = ?',
            [newPath, vol.id]
          );
          
          console.log(`   ✅ Renombrado\n`);
        } else {
          console.log(`   ⚠️  Archivo no encontrado, solo actualizando BD\n`);
          await db._run(
            'UPDATE volumes SET file_path = ? WHERE id = ?',
            [newPath, vol.id]
          );
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    } else {
      console.log(`✓ ${newFileName} - sin cambios\n`);
    }
  }
  
  db._save();
  
  console.log('✅ Renombrado completado!\n');
  
  // Listar archivos finales
  console.log('📁 Archivos en uploads:');
  const files = fs.readdirSync('uploads')
    .filter(f => f.endsWith('.pdf'))
    .sort();
  
  files.forEach(f => console.log(`   ${f}`));
  
  console.log('');
  await db.close();
}

renameFiles().catch(error => {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
