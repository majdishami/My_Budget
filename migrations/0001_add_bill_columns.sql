-- Add new columns to bills table with safe defaults
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS is_one_time boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_yearly boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS date timestamp,
ADD COLUMN IF NOT EXISTS yearly_date timestamp,
ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_days integer NOT NULL DEFAULT 7;
