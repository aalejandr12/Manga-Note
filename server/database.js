const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

class Database {
  constructor(dbPath) {
    this.dbPath = path.resolve(dbPath || './database/manga_library.db');
    this.ready = this._init();
  }

  async _init() {
    const SQL = await initSqlJs({
      locateFile: (file) => require.resolve('sql.js/dist/' + file),
    });

    // Cargar base existente o crear nueva
    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(new Uint8Array(fileBuffer));
    } else {
      // Asegurar carpeta
      fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
      this.db = new SQL.Database();
    }

    this._initTables();
    console.log('✓ Base de datos (sql.js) lista');
  }

  _save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  _initTables() {
    // Verificar si necesitamos migración
    try {
      // Intentar obtener estructura de series
      const result = this.db.exec("PRAGMA table_info(series);");
      if (result.length > 0) {
        const columns = result[0].values.map(row => row[1]); // Nombre de columnas
        
        // Si no tiene la columna 'author', necesitamos migrar
        if (!columns.includes('author')) {
          console.log('🔄 Migrando base de datos a nueva versión...');
          this._migrateDatabase();
          return;
        }

        // Añadir columnas nuevas si faltan
        if (!columns.includes('reading_mode')) {
          console.log('🧩 Agregando columna series.reading_mode...');
          this.db.run("ALTER TABLE series ADD COLUMN reading_mode TEXT");
        }
        if (!columns.includes('publication_status')) {
          console.log('🧩 Agregando columna series.publication_status...');
          this.db.run("ALTER TABLE series ADD COLUMN publication_status TEXT");
          this._save();
        }
      }
    } catch (error) {
      // Si no existe la tabla, se creará normalmente
    }

    // series
    this.db.run(`CREATE TABLE IF NOT EXISTS series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_code TEXT UNIQUE,
      title TEXT NOT NULL,
      normalized_title TEXT NOT NULL,
      genre TEXT,
      total_volumes INTEGER DEFAULT 0,
      cover_image TEXT,
      cover_source TEXT,
      author TEXT,
      year INTEGER,
      description TEXT,
      publisher TEXT,
      tags TEXT,
      reading_mode TEXT,
      publication_status TEXT,
      reading_status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    // volumes
    this.db.run(`CREATE TABLE IF NOT EXISTS volumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      volume_number INTEGER,
      chapter_number INTEGER,
      chapter_start INTEGER,
      chapter_end INTEGER,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      total_pages INTEGER,
      current_page INTEGER DEFAULT 0,
      status TEXT DEFAULT 'unread',
      last_read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    // settings
    this.db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );`);

    // Agregar columna reading_status si no existe (migración)
    try {
      this.db.run(`ALTER TABLE series ADD COLUMN reading_status TEXT DEFAULT 'pending';`);
      console.log('✓ Columna reading_status agregada');
    } catch (e) {
      // La columna ya existe, ignorar error
      if (!e.message.includes('duplicate column')) {
        console.log('ℹ️ reading_status ya existe o error:', e.message);
      }
    }

    // índices
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_series_code ON series(series_code);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_series_title ON series(normalized_title);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_volumes_series ON volumes(series_id);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_volumes_status ON volumes(status);`);

    this._save();
  }

  _migrateDatabase() {
    console.log('📦 Respaldando datos existentes...');
    
    // Respaldar datos de series
    const oldSeries = this.db.exec("SELECT * FROM series;");
    const oldVolumes = this.db.exec("SELECT * FROM volumes;");
    const oldSettings = this.db.exec("SELECT * FROM settings;");
    
    // Eliminar tablas viejas
    this.db.run("DROP TABLE IF EXISTS series;");
    this.db.run("DROP TABLE IF EXISTS volumes;");
    this.db.run("DROP TABLE IF EXISTS settings;");
    
    console.log('🔨 Creando nuevas tablas...');
    
    // Crear nuevas tablas con estructura actualizada
    this.db.run(`CREATE TABLE series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_code TEXT UNIQUE,
      title TEXT NOT NULL,
      normalized_title TEXT NOT NULL,
      genre TEXT,
      total_volumes INTEGER DEFAULT 0,
      cover_image TEXT,
      cover_source TEXT,
      author TEXT,
      year INTEGER,
      description TEXT,
      publisher TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    this.db.run(`CREATE TABLE volumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      volume_number INTEGER,
      chapter_number INTEGER,
      chapter_start INTEGER,
      chapter_end INTEGER,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      total_pages INTEGER,
      current_page INTEGER DEFAULT 0,
      status TEXT DEFAULT 'unread',
      last_read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    this.db.run(`CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );`);
    
    // Restaurar datos de series (con valores null para nuevas columnas y código generado)
    if (oldSeries.length > 0 && oldSeries[0].values.length > 0) {
      console.log(`📚 Restaurando ${oldSeries[0].values.length} series...`);
      const stmt = this.db.prepare(
        `INSERT INTO series (id, series_code, title, normalized_title, genre, total_volumes, cover_image, cover_source, author, year, description, publisher, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`
      );
      
      for (const row of oldSeries[0].values) {
        // Generar código único basado en el título
        const title = row[1];
        let hash = 0;
        for (let i = 0; i < title.length; i++) {
          hash = ((hash << 5) - hash) + title.charCodeAt(i);
          hash = hash & hash;
        }
        const series_code = Math.abs(hash % 10000).toString().padStart(4, '0');
        
        stmt.bind([
          row[0], // id
          series_code, // código generado
          row[1], // title
          row[2], // normalized_title
          row[3], // genre
          row[4], // total_volumes
          row[5], // cover_image
          row[6], // created_at
          row[7]  // updated_at
        ]);
        stmt.step();
        stmt.reset();
      }
      stmt.free();
    }
    
    // Restaurar volúmenes (con valores null para nuevas columnas)
    if (oldVolumes.length > 0 && oldVolumes[0].values.length > 0) {
      console.log(`📖 Restaurando ${oldVolumes[0].values.length} volúmenes...`);
      const stmt = this.db.prepare(
        `INSERT INTO volumes (id, series_id, title, volume_number, chapter_number, chapter_start, chapter_end, file_path, file_size, total_pages, current_page, status, last_read_at, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?)`
      );
      
      for (const row of oldVolumes[0].values) {
        stmt.bind([
          row[0],  // id
          row[1],  // series_id
          row[2],  // title
          row[3],  // volume_number
          row[4],  // chapter_number
          row[5],  // file_path
          row[6],  // file_size
          row[7],  // total_pages
          row[8],  // current_page
          row[9],  // status
          row[10], // last_read_at
          row[11]  // created_at
        ]);
        stmt.step();
        stmt.reset();
      }
      stmt.free();
    }
    
    // Restaurar settings
    if (oldSettings.length > 0 && oldSettings[0].values.length > 0) {
      console.log(`⚙️ Restaurando configuración...`);
      const stmt = this.db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
      for (const row of oldSettings[0].values) {
        stmt.bind(row);
        stmt.step();
        stmt.reset();
      }
      stmt.free();
    }
    
    // Recrear índices
    this.db.run(`CREATE INDEX idx_series_title ON series(normalized_title);`);
    this.db.run(`CREATE INDEX idx_volumes_series ON volumes(series_id);`);
    this.db.run(`CREATE INDEX idx_volumes_status ON volumes(status);`);
    
    this._save();
    console.log('✅ Migración completada exitosamente!');
  }

  // Helpers
  async _run(sql, params = []) {
    await this.ready;
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
    this._save();
  }

  async _get(sql, params = []) {
    await this.ready;
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    let row = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();
    return row;
  }

  async _all(sql, params = []) {
    await this.ready;
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  // Series methods
  async createSeries(data) {
    const { series_code, title, normalized_title, genre, cover_image, cover_source, author, year, description, publisher, tags } = data;
    const tagsJson = tags ? JSON.stringify(tags) : null;
    await this._run(
      `INSERT INTO series (series_code, title, normalized_title, genre, cover_image, cover_source, author, year, description, publisher, tags) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [series_code, title, normalized_title, genre, cover_image, cover_source, author, year, description, publisher, tagsJson]
    );
    const row = await this._get(`SELECT last_insert_rowid() as id;`);
    return row.id;
  }

  async getSeriesByCode(series_code) {
    return await this._get(
      `SELECT * FROM series WHERE series_code = ?`,
      [series_code]
    );
  }

  async updateSeriesMetadata(series_id, data) {
    const updates = [];
    const values = [];
    
    if (data.author !== undefined) {
      updates.push('author = ?');
      values.push(data.author);
    }
    if (data.year !== undefined) {
      updates.push('year = ?');
      values.push(data.year);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.publisher !== undefined) {
      updates.push('publisher = ?');
      values.push(data.publisher);
    }
    if (data.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(data.tags));
    }
    if (data.cover_image !== undefined) {
      updates.push('cover_image = ?');
      values.push(data.cover_image);
    }
    if (data.cover_source !== undefined) {
      updates.push('cover_source = ?');
      values.push(data.cover_source);
    }
    
    if (updates.length === 0) return; // No hay nada que actualizar
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(series_id);
    
    await this._run(
      `UPDATE series SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    this._save(); // Guardar cambios
  }

  async getSeriesByNormalizedTitle(normalized_title) {
    return await this._get(
      `SELECT * FROM series WHERE normalized_title = ?`,
      [normalized_title]
    );
  }

  async getAllSeries() {
    // Construimos conteos con subconsultas porque sql.js no soporta fácilmente agregaciones con LEFT JOIN + COUNT(*) sin GROUP BY según datos ausentes
    const series = await this._all(`SELECT * FROM series ORDER BY updated_at DESC`);
    for (const s of series) {
      const counts = await this._get(
        `SELECT 
           COUNT(id) as volume_count,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
           SUM(CASE WHEN status = 'reading' THEN 1 ELSE 0 END) as reading_count,
           SUM(total_pages) as total_pages_sum,
           SUM(current_page) as current_pages_sum
         FROM volumes WHERE series_id = ?`, [s.id]
      );
      s.volume_count = counts.volume_count || 0;
      s.completed_count = counts.completed_count || 0;
      s.reading_count = counts.reading_count || 0;
      s.total_pages_sum = counts.total_pages_sum || 0;
      s.current_pages_sum = counts.current_pages_sum || 0;
    }
    return series;
  }

  async updateSeriesVolCount(series_id, total_volumes) {
    await this._run(
      `UPDATE series SET total_volumes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [total_volumes, series_id]
    );
  }

  // Volume methods
  async createVolume(data) {
    const { series_id, title, volume_number, chapter_number, chapter_start, chapter_end, file_path, file_size, total_pages } = data;
    await this._run(
      `INSERT INTO volumes (series_id, title, volume_number, chapter_number, chapter_start, chapter_end, file_path, file_size, total_pages)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [series_id, title, volume_number, chapter_number, chapter_start, chapter_end, file_path, file_size, total_pages]
    );
    const row = await this._get(`SELECT last_insert_rowid() as id;`);
    return row.id;
  }

  async getVolumesBySeries(series_id) {
    return await this._all(
      `SELECT * FROM volumes WHERE series_id = ? 
       ORDER BY 
         COALESCE(chapter_start, chapter_number, 9999) ASC,
         COALESCE(chapter_end, chapter_start, chapter_number, 9999) ASC,
         COALESCE(volume_number, 9999) ASC,
         id ASC`,
      [series_id]
    );
  }

  async getVolume(id) {
    const v = await this._get(`SELECT * FROM volumes WHERE id = ?`, [id]);
    if (!v) return null;
    const s = await this._get(`SELECT title FROM series WHERE id = ?`, [v.series_id]);
    v.series_title = s ? s.title : null;
    return v;
  }

  async getSeries(id) {
    const s = await this._get(`SELECT * FROM series WHERE id = ?`, [id]);
    if (!s) return null;
    const counts = await this._get(
      `SELECT 
         COUNT(id) as volume_count,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
         SUM(CASE WHEN status = 'reading' THEN 1 ELSE 0 END) as reading_count,
         SUM(total_pages) as total_pages_sum,
         SUM(current_page) as current_pages_sum
       FROM volumes WHERE series_id = ?`, [id]
    );
    s.volume_count = counts.volume_count || 0;
    s.completed_count = counts.completed_count || 0;
    s.reading_count = counts.reading_count || 0;
    s.total_pages_sum = counts.total_pages_sum || 0;
    s.current_pages_sum = counts.current_pages_sum || 0;
    return s;
  }

  async updateSeriesReadingMode(series_id, reading_mode) {
    await this._run(
      `UPDATE series SET reading_mode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [reading_mode, series_id]
    );
  }

  async updateSeriesPublicationStatus(series_id, publication_status) {
    await this._run(
      `UPDATE series SET publication_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [publication_status, series_id]
    );
  }

  async updateSeriesReadingStatus(series_id, reading_status) {
    await this._run(
      `UPDATE series SET reading_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [reading_status, series_id]
    );
  }

  async updateSeriesInfo(series_id, title, author, description) {
    await this._run(
      `UPDATE series SET title = ?, author = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [title, author, description, series_id]
    );
  }

  async deleteVolume(volume_id) {
    // Obtener el volume para saber su series_id
    const volume = await this.getVolume(volume_id);
    if (!volume) return;
    
    // Borrar el volumen
    await this._run(`DELETE FROM volumes WHERE id = ?`, [volume_id]);
    
    // Verificar si quedan volúmenes en la serie
    const remainingVolumes = await this._all(
      `SELECT COUNT(*) as count FROM volumes WHERE series_id = ?`,
      [volume.series_id]
    );
    
    // Si no quedan volúmenes, borrar la serie también
    if (remainingVolumes[0].count === 0) {
      console.log(`🗑️  Serie ${volume.series_id} sin volúmenes, borrando serie...`);
      await this._run(`DELETE FROM series WHERE id = ?`, [volume.series_id]);
    }
    
    this._save();
    return { seriesDeleted: remainingVolumes[0].count === 0 };
  }

  async deleteSeries(series_id) {
    // Primero borrar los volúmenes
    await this._run(`DELETE FROM volumes WHERE series_id = ?`, [series_id]);
    // Luego borrar la serie
    await this._run(`DELETE FROM series WHERE id = ?`, [series_id]);
    this._save();
  }

  async updateVolumeProgress(id, current_page, status, total_pages = null) {
    if (total_pages !== null) {
      await this._run(
        `UPDATE volumes SET current_page = ?, status = ?, total_pages = ?, last_read_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [current_page, status, total_pages, id]
      );
    } else {
      await this._run(
        `UPDATE volumes SET current_page = ?, status = ?, last_read_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [current_page, status, id]
      );
    }
  }

  async getRecentlyRead(limit = 10) {
    const rows = await this._all(
      `SELECT * FROM volumes WHERE last_read_at IS NOT NULL ORDER BY last_read_at DESC LIMIT ?`,
      [limit]
    );
    for (const v of rows) {
      const s = await this._get(`SELECT title, cover_image FROM series WHERE id = ?`, [v.series_id]);
      v.series_title = s ? s.title : null;
      v.cover_image = s ? s.cover_image : null;
    }
    return rows;
  }

  // Settings methods
  async getSetting(key) {
    const row = await this._get(`SELECT value FROM settings WHERE key = ?`, [key]);
    return row ? row.value : null;
  }

  async setSetting(key, value) {
    await this._run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
  }

  // ==================== SERIES POLICIES ====================
  
  /**
   * Obtiene la política de una serie por ID
   */
  async getSeriesPolicy(seriesId) {
    await this.ready;
    const result = this.db.exec(`SELECT * FROM series_policies WHERE series_id = ?`, [seriesId]);
    if (!result[0] || !result[0].values[0]) return null;
    
    const row = result[0];
    const policy = {};
    row.columns.forEach((col, i) => {
      policy[col] = row.values[0][i];
    });
    
    // Parsear JSON fields
    if (policy.aliases) policy.aliases = JSON.parse(policy.aliases);
    if (policy.treat_as_arc) policy.treat_as_arc = JSON.parse(policy.treat_as_arc);
    if (policy.treat_as_spinoff) policy.treat_as_spinoff = JSON.parse(policy.treat_as_spinoff);
    if (policy.romanizations) policy.romanizations = JSON.parse(policy.romanizations);
    
    return policy;
  }

  /**
   * Actualiza o crea política para una serie
   */
  async upsertSeriesPolicy(seriesId, policy) {
    await this.ready;
    
    const aliases = policy.aliases ? JSON.stringify(policy.aliases) : null;
    const treatAsArc = policy.treat_as_arc ? JSON.stringify(policy.treat_as_arc) : null;
    const treatAsSpinoff = policy.treat_as_spinoff ? JSON.stringify(policy.treat_as_spinoff) : null;
    const romanizations = policy.romanizations ? JSON.stringify(policy.romanizations) : null;
    
    this.db.run(`
      INSERT OR REPLACE INTO series_policies 
      (series_id, title_canonical, title_locked, do_not_translate, aliases, treat_as_arc, treat_as_spinoff, romanizations, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      seriesId,
      policy.title_canonical,
      policy.title_locked ? 1 : 0,
      policy.do_not_translate ? 1 : 0,
      aliases,
      treatAsArc,
      treatAsSpinoff,
      romanizations,
      policy.notes || null
    ]);
    
    this._save();
  }

  // ==================== MATCHING LOGS ====================
  
  /**
   * Registra un log de matching
   */
  async logMatching(log) {
    await this.ready;
    
    this.db.run(`
      INSERT INTO matching_logs 
      (filename, series_id, matched, score, method, alias_used, subtitle_detected, subtitle_classification, reason, llm_response, error, processing_time_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      log.filename,
      log.series_id || null,
      log.matched ? 1 : 0,
      log.score || null,
      log.method,
      log.alias_used || null,
      log.subtitle_detected || null,
      log.subtitle_classification || null,
      log.reason || null,
      log.llm_response ? JSON.stringify(log.llm_response) : null,
      log.error || null,
      log.processing_time_ms || null
    ]);
    
    this._save();
  }

  /**
   * Obtiene logs de matching recientes
   */
  async getMatchingLogs(limit = 50) {
    await this.ready;
    const result = this.db.exec(`
      SELECT * FROM matching_logs 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [limit]);
    
    if (!result[0]) return [];
    
    const rows = [];
    const cols = result[0].columns;
    for (const values of result[0].values) {
      const row = {};
      cols.forEach((col, i) => {
        row[col] = values[i];
      });
      rows.push(row);
    }
    
    return rows;
  }

  close() {
    this._save();
  }
}

module.exports = Database;
