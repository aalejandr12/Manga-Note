#!/usr/bin/env node
/**
 * Script de migración para agregar tablas de políticas y auditoría
 * Ejecutar: node migrations/run-migration.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../database/manga_library.db');
const MIGRATION_FILE = path.resolve(__dirname, '001_add_policies_tables.sql');

async function runMigration() {
  console.log('🔄 Iniciando migración de base de datos...\n');
  
  // Verificar que existe la BD
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ No se encontró la base de datos en:', DB_PATH);
    process.exit(1);
  }

  // Verificar que existe el archivo de migración
  if (!fs.existsSync(MIGRATION_FILE)) {
    console.error('❌ No se encontró el archivo de migración:', MIGRATION_FILE);
    process.exit(1);
  }

  try {
    // Inicializar sql.js
    const SQL = await initSqlJs({
      locateFile: (file) => require.resolve('sql.js/dist/' + file),
    });

    // Cargar base de datos
    console.log('📂 Cargando base de datos...');
    const fileBuffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(new Uint8Array(fileBuffer));

    // Backup antes de migrar
    const backupPath = DB_PATH + '.backup-' + Date.now();
    console.log('💾 Creando backup en:', backupPath);
    fs.copyFileSync(DB_PATH, backupPath);

    // Leer SQL de migración
    console.log('📜 Leyendo archivo de migración...');
    const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');

    // Separar comandos SQL (split por punto y coma, ignorando comentarios)
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`\n🚀 Ejecutando ${commands.length} comandos SQL...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      
      // Extraer primera línea para mostrar
      const firstLine = cmd.split('\n')[0].substring(0, 60);
      
      try {
        db.run(cmd + ';');
        console.log(`✅ [${i + 1}/${commands.length}] ${firstLine}...`);
        successCount++;
      } catch (error) {
        // Ignorar errores de "ya existe" (es esperado en re-runs)
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate column')) {
          console.log(`⚠️  [${i + 1}/${commands.length}] ${firstLine}... (ya existe, saltando)`);
        } else {
          console.error(`❌ [${i + 1}/${commands.length}] Error: ${error.message}`);
          console.error(`   Comando: ${firstLine}...`);
          errorCount++;
        }
      }
    }

    // Guardar cambios
    console.log('\n💾 Guardando cambios...');
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);

    // Cerrar BD
    db.close();

    // Resumen
    console.log('\n' + '='.repeat(50));
    console.log('✅ Migración completada!');
    console.log(`   Comandos exitosos: ${successCount}`);
    console.log(`   Comandos con error: ${errorCount}`);
    console.log(`   Backup guardado en: ${path.basename(backupPath)}`);
    console.log('='.repeat(50) + '\n');

    // Verificar tablas creadas
    console.log('🔍 Verificando tablas creadas...\n');
    const dbVerify = new SQL.Database(fs.readFileSync(DB_PATH));
    
    const tables = ['series_policies', 'matching_logs'];
    for (const table of tables) {
      try {
        const result = dbVerify.exec(`SELECT COUNT(*) as count FROM ${table}`);
        const count = result[0]?.values[0]?.[0] || 0;
        console.log(`   ✓ ${table}: ${count} registros`);
      } catch (error) {
        console.log(`   ✗ ${table}: NO EXISTE`);
      }
    }

    // Verificar vista
    try {
      const result = dbVerify.exec(`SELECT COUNT(*) as count FROM v_series_with_policies`);
      const count = result[0]?.values[0]?.[0] || 0;
      console.log(`   ✓ v_series_with_policies: ${count} registros`);
    } catch (error) {
      console.log(`   ✗ v_series_with_policies: NO EXISTE`);
    }

    dbVerify.close();

    console.log('\n🎉 Todo listo! Las nuevas tablas están disponibles.\n');
    
  } catch (error) {
    console.error('\n❌ Error fatal durante la migración:');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
runMigration().catch(console.error);
