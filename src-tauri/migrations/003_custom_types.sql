-- Custom annotation types table
CREATE TABLE IF NOT EXISTS custom_annotation_types (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    label       TEXT NOT NULL,
    color       TEXT NOT NULL,
    prompt      TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Remove CHECK constraint on annotations.type to allow custom types
-- SQLite requires table recreation to drop constraints
CREATE TABLE IF NOT EXISTS annotations_new (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id         INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    body            TEXT NOT NULL,
    start_offset    INTEGER NOT NULL,
    end_offset      INTEGER NOT NULL,
    anchor_text     TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','dismissed')),
    model_used      TEXT NOT NULL,
    latency_ms      INTEGER,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO annotations_new SELECT * FROM annotations;
DROP TABLE annotations;
ALTER TABLE annotations_new RENAME TO annotations;

CREATE INDEX IF NOT EXISTS idx_annotations_file   ON annotations(file_id);
CREATE INDEX IF NOT EXISTS idx_annotations_status ON annotations(status);
CREATE INDEX IF NOT EXISTS idx_annotations_type   ON annotations(type);
