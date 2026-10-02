CREATE TABLE requirements (
  id             INTEGER PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  text           TEXT NOT NULL,
  kind           TEXT NOT NULL CHECK (kind IN ('required', 'preferred')),
  met            INTEGER NOT NULL DEFAULT 0 CHECK (met IN (0, 1)),
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
) STRICT;

CREATE INDEX requirements_application_idx ON requirements (application_id, kind DESC, id);
