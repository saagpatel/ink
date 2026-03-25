CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES
    ('ollama_endpoint',    'http://localhost:11434'),
    ('ollama_model',       'llama3.2:3b'),
    ('annotation_density', '2'),
    ('debounce_ms',        '2500'),
    ('last_workspace',     '');
