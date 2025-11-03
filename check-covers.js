const Database = require('./server/database');

async function checkCovers() {
  const db = new Database();
  await db._init();
  
  const series = await db.getAllSeries();
  console.log('\n📊 Series con portadas:');
  series.forEach(s => {
    console.log(`\nID: ${s.id}`);
    console.log(`Título: ${s.title}`);
    console.log(`Cover: ${s.cover_image}`);
    console.log(`Cover Source: ${s.cover_source}`);
  });
  
  process.exit(0);
}

checkCovers();
