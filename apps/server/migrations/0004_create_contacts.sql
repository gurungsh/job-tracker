CREATE TABLE contacts (
  id         INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  name       TEXT NOT NULL,
  role       TEXT,
  email      TEXT,
  phone      TEXT,
  notes      TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX contacts_company_idx ON contacts (company_id, name COLLATE NOCASE);

ALTER TABLE activities ADD COLUMN contact_id INTEGER REFERENCES contacts (id) ON DELETE SET NULL;
CREATE INDEX activities_contact_idx ON activities (contact_id);
