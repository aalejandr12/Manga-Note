#!/usr/bin/env node
/**
 * Script para configurar políticas de ejemplo en series existentes
 * Ejecutar: node scripts/setup-example-policies.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../database/manga_library.db');

async function setupPolicies() {
  console.log('🔧 Configurando políticas de ejemplo...\n');
  
  const SQL = await initSqlJs({
    locateFile: (file) => require.resolve('sql.js/dist/' + file),
  });

  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(new Uint8Array(fileBuffer));

  try {
    // Obtener todas las series
    const seriesResult = db.exec('SELECT id, title, series_code FROM series');
    
    if (!seriesResult[0]) {
      console.log('⚠️  No hay series en la base de datos');
      db.close();
      return;
    }

    const series = [];
    const cols = seriesResult[0].columns;
    for (const values of seriesResult[0].values) {
      const row = {};
      cols.forEach((col, i) => {
        row[col] = values[i];
      });
      series.push(row);
    }

    console.log(`📚 Encontradas ${series.length} series\n`);

    // Configurar políticas específicas por serie
    for (const s of series) {
      let policy = {
        title_canonical: s.title,
        title_locked: false,
        do_not_translate: true,  // Por defecto, no traducir
        aliases: [],
        treat_as_arc: [],
        treat_as_spinoff: [],
        notes: 'Política auto-generada'
      };

      // Políticas específicas según el título
      const titleLower = s.title.toLowerCase();

      if (titleLower.includes('amor') && titleLower.includes('ilusion')) {
        // "El Amor Es Una Ilusión"
        policy.title_canonical = '¡El Amor Es Una Ilusión!';
        policy.title_locked = true;
        policy.aliases = ['El Amor Es Una Ilusion', 'El Amor Es Una Ilusión!', 'Love is an Illusion'];
        policy.treat_as_arc = ['superstar', 'extra', 'omake'];
        policy.treat_as_spinoff = ['another story'];
        policy.notes = 'Serie principal con arc Superstar';
        console.log(`✨ ${s.title} → Configurando con arc "superstar"`);
      } 
      else if (titleLower.includes('novia') && titleLower.includes('titan')) {
        // "La Novia del Titán"
        policy.title_canonical = 'La Novia del Titán';
        policy.title_locked = true;
        policy.do_not_translate = true;
        policy.aliases = ['La novia del titan', 'La Novia del Titan'];
        policy.notes = 'NO traducir a "Love Titan" o "El dulce dolor"';
        console.log(`🔒 ${s.title} → Bloqueado contra traducciones`);
      }
      else {
        console.log(`📝 ${s.title} → Política por defecto`);
      }

      // Insertar política
      db.run(`
        INSERT OR REPLACE INTO series_policies 
        (series_id, title_canonical, title_locked, do_not_translate, aliases, treat_as_arc, treat_as_spinoff, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        s.id,
        policy.title_canonical,
        policy.title_locked ? 1 : 0,
        policy.do_not_translate ? 1 : 0,
        JSON.stringify(policy.aliases),
        JSON.stringify(policy.treat_as_arc),
        JSON.stringify(policy.treat_as_spinoff),
        policy.notes
      ]);
    }

    // Guardar cambios
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    
    db.close();

    console.log('\n✅ Políticas configuradas exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   Total de series: ${series.length}`);
    console.log(`   Políticas aplicadas: ${series.length}`);
    console.log('\n🔍 Para ver las políticas:');
    console.log('   SELECT * FROM series_policies;\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    db.close();
    process.exit(1);
  }
}

setupPolicies().catch(console.error);
