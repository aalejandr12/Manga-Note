#!/usr/bin/env node
/**
 * Script de migración simplificado - ejecuta comandos uno por uno
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../database/manga_library.db');

async function runMigration() {
  console.log('🔄 Iniciando migración...\n');
  
  const SQL = await initSqlJs({
    locateFile: (file) => require.resolve('sql.js/dist/' + file),
  });

  // Backup
  const backupPath = DB_PATH + '.backup-' + Date.now();
  fs.copyFileSync(DB_PATH, backupPath);
  console.log('💾 Backup creado:', path.basename(backupPath), '\n');

  // Cargar BD
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(new Uint8Array(fileBuffer));

  try {
    console.log('📋 Creando tabla series_policies...');
    db.run(`
      CREATE TABLE IF NOT EXISTS series_policies (
        series_id INTEGER PRIMARY KEY,
        title_canonical TEXT NOT NULL,
        title_locked BOOLEAN DEFAULT FALSE,
        do_not_translate BOOLEAN DEFAULT TRUE,
        aliases TEXT,
        treat_as_arc TEXT,
        treat_as_spinoff TEXT,
        romanizations TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
      )
    `);
    console.log('   ✅ series_policies creada\n');

    console.log('📋 Creando tabla matching_logs...');
    db.run(`
      CREATE TABLE IF NOT EXISTS matching_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        series_id INTEGER,
        matched BOOLEAN DEFAULT FALSE,
        score REAL,
        method TEXT NOT NULL,
        alias_used TEXT,
        subtitle_detected TEXT,
        subtitle_classification TEXT,
        reason TEXT,
        llm_response TEXT,
        error TEXT,
        processing_time_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL
      )
    `);
    console.log('   ✅ matching_logs creada\n');

    console.log('📋 Creando índices...');
    db.run(`CREATE INDEX IF NOT EXISTS idx_series_policies_canonical ON series_policies(title_canonical)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_series_policies_locked ON series_policies(title_locked)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_matching_logs_filename ON matching_logs(filename)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_matching_logs_series ON matching_logs(series_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_matching_logs_method ON matching_logs(method)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_matching_logs_matched ON matching_logs(matched)`);
    console.log('   ✅ Índices creados\n');

    console.log('📋 Poblando series_policies con series existentes...');
    db.run(`
      INSERT OR IGNORE INTO series_policies (series_id, title_canonical, title_locked, do_not_translate)
      SELECT 
        id,
        title,
        FALSE,
        TRUE
      FROM series
    `);
    
    const result = db.exec(`SELECT COUNT(*) FROM series_policies`);
    const count = result[0]?.values[0]?.[0] || 0;
    console.log(`   ✅ ${count} políticas inicializadas\n`);

    console.log('📋 Creando vista v_series_with_policies...');
    db.run(`
      CREATE VIEW IF NOT EXISTS v_series_with_policies AS
      SELECT 
        s.id,
        s.title,
        s.series_code,
        s.total_volumes as total_chapters,
        sp.title_canonical,
        sp.title_locked,
        sp.do_not_translate,
        sp.aliases,
        sp.treat_as_arc,
        sp.treat_as_spinoff,
        sp.romanizations,
        sp.notes,
        sp.updated_at as policy_updated_at
      FROM series s
      LEFT JOIN series_policies sp ON s.id = sp.series_id
    `);
    console.log('   ✅ Vista creada\n');

    console.log('📋 Creando trigger para updated_at...');
    db.run(`
      CREATE TRIGGER IF NOT EXISTS update_series_policies_timestamp 
      AFTER UPDATE ON series_policies
      FOR EACH ROW
      BEGIN
        UPDATE series_policies 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE series_id = NEW.series_id;
      END
    `);
    console.log('   ✅ Trigger creado\n');

    // Guardar
    console.log('💾 Guardando cambios...');
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    db.close();

    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRACIÓN EXITOSA!');
    console.log('='.repeat(60));
    console.log('\n📊 Tablas creadas:');
    console.log('   • series_policies');
    console.log('   • matching_logs');
    console.log('   • v_series_with_policies (vista)');
    console.log('\n🎉 Sistema listo para usar las nuevas funcionalidades!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    db.close();
    process.exit(1);
  }
}

runMigration().catch(console.error);
