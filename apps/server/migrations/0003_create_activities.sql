CREATE TABLE activities (
  id             INTEGER PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('note', 'email', 'call', 'interview', 'stage_change')),
  occurred_on    TEXT NOT NULL, -- YYYY-MM-DD
  text           TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
) STRICT;

CREATE INDEX activities_application_idx ON activities (application_id, occurred_on DESC, id DESC);
