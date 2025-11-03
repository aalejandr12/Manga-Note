const Database = require('./server/database.js');
const fs = require('fs');
const path = require('path');

async function fixFilePaths() {
  const db = new Database('./database/manga_library.db');
  await db.ready;

  console.log('🔧 REPARANDO RUTAS DE ARCHIVOS EN LA BASE DE DATOS\n');
  console.log('='.repeat(70));

  // Obtener todos los volúmenes del 2 de noviembre
  const stmt = db.db.prepare(`
    SELECT id, title, file_path 
    FROM volumes 
    WHERE created_at LIKE '2025-11-02%'
    ORDER BY id
  `);
  
  const volumes = [];
  stmt.bind();
  while (stmt.step()) {
    volumes.push(stmt.getAsObject());
  }
  stmt.free();

  console.log(`📚 Total volúmenes del 2 Nov: ${volumes.length}\n`);

  // Obtener todos los archivos físicos en uploads/
  const uploadsDir = './uploads';
  const files = fs.readdirSync(uploadsDir);
  
  // Filtrar solo archivos del 2 de noviembre con códigos [XXXX]
  const nov2Files = files.filter(f => {
    if (!f.endsWith('.pdf') || !f.includes('[') || !f.includes(']')) return false;
    
    try {
      const stat = fs.statSync(path.join(uploadsDir, f));
      const date = stat.mtime;
      return date.getMonth() === 10 && date.getDate() === 2 && date.getFullYear() === 2025;
    } catch (e) {
      return false;
    }
  });

  console.log(`📁 Archivos físicos con códigos [XXXX]: ${nov2Files.length}\n`);

  let fixed = 0;
  let notFound = 0;
  let alreadyCorrect = 0;

  console.log('🔍 Buscando coincidencias...\n');

  for (const volume of volumes) {
    const currentPath = volume.file_path;
    const currentFilename = path.basename(currentPath);
    
    // Verificar si el archivo actual existe
    if (fs.existsSync(currentPath)) {
      alreadyCorrect++;
      continue;
    }

    // Intentar encontrar el archivo correcto
    // Normalizar el título para buscar coincidencias
    const normalize = (str) => str
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^\w\s]/g, '') // Quitar símbolos
      .replace(/\s+/g, '')
      .trim();

    const volumeNormalized = normalize(volume.title);
    
    // Buscar archivo que coincida con el título
    const matchingFile = nov2Files.find(f => {
      const fileNormalized = normalize(f.replace(/\[.*?\]\.pdf$/, '')); // Quitar código y extensión
      return fileNormalized.includes(volumeNormalized) || volumeNormalized.includes(fileNormalized);
    });

    if (matchingFile) {
      const newPath = path.join(uploadsDir, matchingFile);
      
      console.log(`✅ Vol #${volume.id}: ${matchingFile}`);
      
      // Actualizar en la base de datos
      await db._run('UPDATE volumes SET file_path = ? WHERE id = ?', [newPath, volume.id]);
      fixed++;
      
    } else {
      console.log(`❌ Vol #${volume.id}: ${volume.title} - NO ENCONTRADO`);
      notFound++;
    }
  }

  // Guardar cambios
  db._save();

  console.log('\n' + '='.repeat(70));
  console.log('📊 RESUMEN:');
  console.log(`   ✅ Corregidos: ${fixed}`);
  console.log(`   ✓ Ya correctos: ${alreadyCorrect}`);
  console.log(`   ❌ No encontrados: ${notFound}`);
  console.log('='.repeat(70));

  if (fixed > 0) {
    console.log('\n🎉 Base de datos actualizada exitosamente!');
  }

  process.exit(0);
}

fixFilePaths().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
