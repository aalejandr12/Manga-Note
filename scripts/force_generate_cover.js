// Script de utilidad: genera portada (primera página) para el primer volumen de una serie
// Uso: node scripts/force_generate_cover.js <seriesId>
const path = require('path');
const fs = require('fs').promises;
const Database = require('../server/database');
const extractor = require('../server/services/pdf-cover-extractor');

async function main() {
  const seriesId = process.argv[2] || '1';
  const db = new Database(process.env.DB_PATH || './database/manga_library.db');
  await db.ready;

  console.log('Buscando primer volumen de la serie', seriesId);
  const vol = await db._get(`SELECT id, file_path FROM volumes WHERE series_id = ? ORDER BY id LIMIT 1`, [seriesId]);
  if (!vol || !vol.file_path) {
    console.error('No se encontró volumen o file_path vacío');
    process.exit(1);
  }

  const pdfPath = vol.file_path;
  console.log('Archivo a procesar:', pdfPath);

  const extracted = await extractor.extractFirstPage(pdfPath, seriesId);
  if (extracted) {
    console.log('Portada generada en:', extracted);
    await db._run('UPDATE series SET cover_image = ?, cover_source = ? WHERE id = ?', [extracted, 'pdf_extracted', seriesId]);
    db._save();
    console.log('Base de datos actualizada. cover_image =', extracted);
  } else {
    console.log('No se pudo generar portada automáticamente');
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(2); });
