// check-db.js - Verificar contenido de la base de datos
const Database = require('./server/database.js');

async function checkDatabase() {
  const db = new Database();
  
  const series = await db._all('SELECT * FROM series');
  const volumes = await db._all('SELECT id, series_id, title, chapter_start, chapter_end, file_path FROM volumes ORDER BY id');
  
  console.log('\n📊 SERIES:', series.length);
  if (series.length > 0) {
    series.forEach(s => {
      console.log(`\n  ID: ${s.id}`);
      console.log(`  Título: ${s.title}`);
      console.log(`  Portada: ${s.cover_image}`);
      console.log(`  Cover Source: ${s.cover_source}`);
      console.log(`  Total Volúmenes: ${s.total_volumes}`);
    });
  }
  
  console.log('\n📚 VOLUMES:', volumes.length);
  if (volumes.length > 0) {
    volumes.forEach(v => {
      console.log(`\n  ID: ${v.id} | Series ID: ${v.series_id}`);
      console.log(`  Título: ${v.title}`);
      console.log(`  Capítulos: ${v.chapter_start}${v.chapter_end ? '-' + v.chapter_end : ''}`);
      console.log(`  Archivo: ${v.file_path}`);
    });
  }
  
  process.exit(0);
}

checkDatabase().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
