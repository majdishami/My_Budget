-- Add new columns to bills table with safe defaults
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS is_one_time boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_yearly boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS date timestamp,
ADD COLUMN IF NOT EXISTS yearly_date timestamp,
ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_days integer NOT NULL DEFAULT 7;

-- Step 1: Add new columns for recurrence tracking
ALTER TABLE transactions
ADD COLUMN recurring_type VARCHAR(50) DEFAULT NULL,
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN frequency_date INT DEFAULT NULL;

-- Step 2: Populate `recurring_type` for existing transactions (monthly for all expenses)
UPDATE transactions
SET recurring_type = 'monthly', is_recurring = TRUE
WHERE type = 'expense';

-- Step 3: Set `frequency_date` based on the existing `date` field (only for monthly recurring expenses)
UPDATE transactions
SET frequency_date = EXTRACT(DAY FROM date)
WHERE recurring_type = 'monthly';

-- Step 4: Ensure `date` stores only the frequency day for monthly transactions
UPDATE transactions
SET date = CAST(frequency_date AS VARCHAR)
WHERE recurring_type = 'monthly';

-- Step 5: Verify changes
SELECT id, description, amount, date, type, recurring_type, is_recurring, frequency_date
FROM transactions;
