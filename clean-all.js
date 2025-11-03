#!/usr/bin/env node

/**
 * Script para limpiar todos los mangas y archivos subidos
 */

const Database = require('./server/database');
const fs = require('fs');
const path = require('path');

async function cleanAll() {
  const db = new Database('./database/manga_library.db');
  await db.ready;
  
  console.log('\n🧹 Limpiando biblioteca...\n');
  
  // Obtener todos los volúmenes para eliminar archivos
  const volumes = await db._all('SELECT file_path FROM volumes');
  
  console.log(`📚 Encontrados ${volumes.length} volúmenes\n`);
  
  // Eliminar archivos PDF
  for (const vol of volumes) {
    try {
      if (fs.existsSync(vol.file_path)) {
        fs.unlinkSync(vol.file_path);
        console.log(`   ✓ Eliminado: ${path.basename(vol.file_path)}`);
      }
    } catch (error) {
      console.log(`   ⚠️  No se pudo eliminar: ${vol.file_path}`);
    }
  }
  
  console.log('\n📂 Eliminando portadas...\n');
  
  // Eliminar portadas
  const coversDir = './uploads/covers';
  if (fs.existsSync(coversDir)) {
    const covers = fs.readdirSync(coversDir);
    for (const cover of covers) {
      if (cover !== '.gitkeep') {
        try {
          fs.unlinkSync(path.join(coversDir, cover));
          console.log(`   ✓ Eliminada: ${cover}`);
        } catch (error) {
          console.log(`   ⚠️  No se pudo eliminar: ${cover}`);
        }
      }
    }
  }
  
  console.log('\n🗑️  Limpiando base de datos...\n');
  
  // Limpiar tablas
  await db._run('DELETE FROM volumes');
  await db._run('DELETE FROM series');
  
  // Resetear autoincrement
  await db._run('DELETE FROM sqlite_sequence WHERE name IN ("volumes", "series")');
  
  db._save();
  
  console.log('✅ Base de datos limpiada\n');
  
  // Verificar
  const remainingSeries = await db._all('SELECT COUNT(*) as count FROM series');
  const remainingVolumes = await db._all('SELECT COUNT(*) as count FROM volumes');
  
  console.log('📊 Estado final:');
  console.log(`   Series: ${remainingSeries[0].count}`);
  console.log(`   Volúmenes: ${remainingVolumes[0].count}`);
  console.log('');
  
  await db.close();
  
  console.log('✨ ¡Limpieza completada! La biblioteca está vacía y lista para nuevas pruebas.\n');
}

cleanAll().catch(error => {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
