-- Migración 001: Agregar tablas de políticas y auditoría
-- Fecha: 2 de noviembre de 2025
-- Sistema: MangaRead v2.1

-- ============================================
-- Tabla 1: series_policies
-- Políticas de matching por serie
-- ============================================

CREATE TABLE IF NOT EXISTS series_policies (
  series_id INTEGER PRIMARY KEY,
  title_canonical TEXT NOT NULL,
  title_locked BOOLEAN DEFAULT FALSE,
  do_not_translate BOOLEAN DEFAULT TRUE,
  aliases TEXT, -- JSON array: ["alias1", "alias2", "romanización"]
  treat_as_arc TEXT, -- JSON array: ["superstar", "extra", "special"]
  treat_as_spinoff TEXT, -- JSON array: ["another story", "side-b"]
  romanizations TEXT, -- JSON array: ["romaji", "english title"]
  notes TEXT, -- Notas administrativas
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_series_policies_canonical 
  ON series_policies(title_canonical);

CREATE INDEX IF NOT EXISTS idx_series_policies_locked 
  ON series_policies(title_locked);

-- ============================================
-- Tabla 2: matching_logs
-- Auditoría de matching para debugging
-- ============================================

CREATE TABLE IF NOT EXISTS matching_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  series_id INTEGER,
  matched BOOLEAN DEFAULT FALSE,
  score REAL, -- Score de similitud (0.0 - 1.0)
  method TEXT NOT NULL, -- 'llm' | 'local_high' | 'local_alias' | 'manual' | 'fallback'
  alias_used TEXT, -- Alias que coincidió (si aplica)
  subtitle_detected TEXT, -- Subtítulo detectado (si aplica)
  subtitle_classification TEXT, -- 'arc' | 'spinoff' | 'sequel' | 'unknown'
  reason TEXT, -- Explicación del match o no-match
  llm_response TEXT, -- JSON completo de respuesta LLM (si aplica)
  error TEXT, -- Error si lo hubo
  processing_time_ms INTEGER, -- Tiempo de procesamiento
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL
);

-- Índices para análisis
CREATE INDEX IF NOT EXISTS idx_matching_logs_filename 
  ON matching_logs(filename);

CREATE INDEX IF NOT EXISTS idx_matching_logs_series 
  ON matching_logs(series_id);

CREATE INDEX IF NOT EXISTS idx_matching_logs_method 
  ON matching_logs(method);

CREATE INDEX IF NOT EXISTS idx_matching_logs_matched 
  ON matching_logs(matched);

CREATE INDEX IF NOT EXISTS idx_matching_logs_date 
  ON matching_logs(created_at DESC);

-- ============================================
-- Poblar series_policies con series existentes
-- ============================================

INSERT OR IGNORE INTO series_policies (series_id, title_canonical, title_locked, do_not_translate)
SELECT 
  id,
  title,
  FALSE, -- Por defecto no bloqueado
  TRUE   -- Por defecto no traducir
FROM series
WHERE NOT EXISTS (
  SELECT 1 FROM series_policies WHERE series_policies.series_id = series.id
);

-- ============================================
-- Vista para consulta fácil
-- ============================================

CREATE VIEW IF NOT EXISTS v_series_with_policies AS
SELECT 
  s.id,
  s.title,
  s.series_code,
  s.total_chapters,
  s.has_cover,
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
LEFT JOIN series_policies sp ON s.id = sp.series_id;

-- ============================================
-- Trigger para actualizar updated_at
-- ============================================

CREATE TRIGGER IF NOT EXISTS update_series_policies_timestamp 
AFTER UPDATE ON series_policies
FOR EACH ROW
BEGIN
  UPDATE series_policies 
  SET updated_at = CURRENT_TIMESTAMP 
  WHERE series_id = NEW.series_id;
END;

-- ============================================
-- Función de utilidad (comentada, ejecutar manualmente si se necesita)
-- ============================================

-- Para limpiar logs antiguos (mayores a 30 días):
-- DELETE FROM matching_logs WHERE created_at < datetime('now', '-30 days');

-- Para ver estadísticas de matching:
-- SELECT 
--   method,
--   matched,
--   COUNT(*) as total,
--   AVG(score) as avg_score,
--   AVG(processing_time_ms) as avg_time_ms
-- FROM matching_logs
-- GROUP BY method, matched
-- ORDER BY total DESC;
