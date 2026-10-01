CREATE TABLE companies (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL COLLATE NOCASE UNIQUE,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE applications (
  id               INTEGER PRIMARY KEY,
  company_id       INTEGER NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  job_title        TEXT NOT NULL,
  stage            TEXT NOT NULL CHECK (stage IN ('wishlist', 'applied', 'screening', 'interviewing',
                                                  'offer', 'accepted', 'rejected', 'withdrawn')),
  next_step        TEXT,
  next_step_due    TEXT, -- YYYY-MM-DD
  applied_on       TEXT, -- YYYY-MM-DD
  closed_on        TEXT, -- YYYY-MM-DD
  stage_changed_at TEXT NOT NULL,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
) STRICT;

CREATE INDEX applications_company_idx ON applications (company_id);
