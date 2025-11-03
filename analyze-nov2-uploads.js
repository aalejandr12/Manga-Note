const Database = require('./server/database.js');
const fs = require('fs');
const path = require('path');

async function analyzeUploads() {
  const db = new Database('./database/manga_library.db');
  await db.ready;

  console.log('📊 ANÁLISIS DE SUBIDAS DEL 2 DE NOVIEMBRE\n');
  console.log('='.repeat(60));

  // 1. Contar archivos físicos del 2 de Nov
  const uploadsDir = './uploads';
  const files = fs.readdirSync(uploadsDir);
  const nov2Files = files.filter(f => {
    try {
      const stat = fs.statSync(path.join(uploadsDir, f));
      const date = stat.mtime;
      return date.getMonth() === 10 && date.getDate() === 2 && date.getFullYear() === 2025;
    } catch (e) {
      return false;
    }
  });

  console.log(`\n📁 Archivos físicos del 2 Nov: ${nov2Files.length}`);

  // 2. Volúmenes en DB del 2 de Nov
  const stmt1 = db.db.prepare(`
    SELECT v.id, v.title, v.file_path, v.series_id, s.title as series_title, s.cover_image
    FROM volumes v 
    LEFT JOIN series s ON v.series_id = s.id 
    WHERE v.created_at LIKE '2025-11-02%'
    ORDER BY v.id
  `);
  
  const volumes = [];
  stmt1.bind();
  while (stmt1.step()) {
    volumes.push(stmt1.getAsObject());
  }
  stmt1.free();

  console.log(`📚 Volúmenes en DB del 2 Nov: ${volumes.length}`);

  // 3. Análisis de problemas
  let orphans = 0;
  let noCover = 0;
  let wrongNames = 0;
  let fileNotExists = 0;

  console.log('\n⚠️ PROBLEMAS DETECTADOS:\n');

  volumes.forEach((vol, idx) => {
    let hasIssue = false;
    let issues = [];

    // Sin serie asignada
    if (!vol.series_id || !vol.series_title) {
      orphans++;
      issues.push('SIN SERIE');
      hasIssue = true;
    }

    // Sin portada
    if (!vol.cover_image || vol.cover_image === '') {
      noCover++;
      issues.push('SIN PORTADA');
      hasIssue = true;
    }

    // Archivo no existe
    const filePath = path.join('.', vol.file_path);
    if (!fs.existsSync(filePath)) {
      fileNotExists++;
      issues.push('ARCHIVO NO EXISTE');
      hasIssue = true;
    }

    // Nombre sospechoso (muy genérico o japonés cuando debería ser español)
    const suspiciousNames = ['Gap', 'Kouya', 'Hero', 'Shining', 'Yamato'];
    if (vol.series_title && suspiciousNames.some(name => vol.series_title.includes(name))) {
      wrongNames++;
      issues.push('NOMBRE SOSPECHOSO');
      hasIssue = true;
    }

    if (hasIssue) {
      console.log(`${idx + 1}. Vol #${vol.id} | Series #${vol.series_id || 'NULL'}`);
      console.log(`   Título Vol: ${vol.title}`);
      console.log(`   Serie: ${vol.series_title || 'N/A'}`);
      console.log(`   Archivo: ${vol.file_path}`);
      console.log(`   Portada: ${vol.cover_image || 'N/A'}`);
      console.log(`   ⚠️ Problemas: ${issues.join(', ')}`);
      console.log('');
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN:');
  console.log(`   Total volúmenes: ${volumes.length}`);
  console.log(`   ❌ Huérfanos (sin serie): ${orphans}`);
  console.log(`   🖼️ Sin portada: ${noCover}`);
  console.log(`   📝 Nombres sospechosos: ${wrongNames}`);
  console.log(`   💾 Archivos no existen: ${fileNotExists}`);
  console.log('='.repeat(60));

  // 4. Buscar Liebling específicamente
  console.log('\n🔍 BÚSQUEDA ESPECÍFICA: LIEBLING\n');
  
  const lieblingStmt = db.db.prepare(`
    SELECT v.id, v.title, v.file_path, v.series_id, s.title as series_title, s.cover_image
    FROM volumes v 
    LEFT JOIN series s ON v.series_id = s.id 
    WHERE LOWER(v.title) LIKE '%liebling%' OR LOWER(v.file_path) LIKE '%liebling%'
  `);
  
  let foundLiebling = false;
  lieblingStmt.bind();
  while (lieblingStmt.step()) {
    const row = lieblingStmt.getAsObject();
    foundLiebling = true;
    console.log(`✓ Encontrado en DB:`);
    console.log(`  Vol ID: ${row.id}`);
    console.log(`  Título: ${row.title}`);
    console.log(`  Serie: ${row.series_title} (ID: ${row.series_id})`);
    console.log(`  Archivo: ${row.file_path}`);
    console.log(`  Portada: ${row.cover_image}`);
    
    // Verificar archivo físico
    if (fs.existsSync(row.file_path)) {
      const stat = fs.statSync(row.file_path);
      console.log(`  ✓ Archivo existe (${(stat.size / 1024 / 1024 / 1024).toFixed(2)} GB)`);
    } else {
      console.log(`  ❌ Archivo NO existe en: ${row.file_path}`);
    }
  }
  lieblingStmt.free();

  if (!foundLiebling) {
    console.log('❌ Liebling NO encontrado en la base de datos');
    
    // Buscar archivo físico
    const lieblingFile = nov2Files.find(f => f.toLowerCase().includes('liebling'));
    if (lieblingFile) {
      console.log(`⚠️ Pero SÍ existe archivo físico: ${lieblingFile}`);
      const stat = fs.statSync(path.join(uploadsDir, lieblingFile));
      console.log(`   Tamaño: ${(stat.size / 1024 / 1024 / 1024).toFixed(2)} GB`);
      console.log(`   Fecha: ${stat.mtime}`);
    }
  }

  process.exit(0);
}

analyzeUploads().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
