ALTER TABLE applications ADD COLUMN archived_at TEXT; -- UTC timestamp, NULL when not archived
ALTER TABLE companies ADD COLUMN website TEXT;
ALTER TABLE activities ADD COLUMN occurred_time TEXT
  CHECK (occurred_time IS NULL OR occurred_time GLOB '[0-2][0-9]:[0-5][0-9]'); -- HH:MM, no time zone
