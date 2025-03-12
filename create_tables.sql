-- Drop tables if they already exist
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS bills;
DROP TABLE IF EXISTS categories;

-- Create categories table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT
);

-- Insert data into categories table
INSERT INTO categories (id, name, color, icon) VALUES
(1, 'Rent', '#3B82F6', 'home'),
(2, 'Groceries', '#10B981', 'shopping-cart'),
(3, 'Personal Loan', '#6366F1', 'credit-card'),
(4, 'Car Insurance', '#F59E0B', 'car'),
(5, 'Maid''s Service', '#EC4899', 'home'),
(6, 'Credit Card Payments', '#8B5CF6', 'credit-card'),
(7, 'Utilities - Electricity', '#F97316', 'zap'),
(8, 'Utilities - Gas', '#EF4444', 'flame'),
(9, 'Utilities - Water', '#3B82F6', 'droplet'),
(10, 'TV Service', '#8B5CF6', 'tv'),
(11, 'Internet', '#2563EB', 'wifi'),
(12, 'Online Services', '#6366F1', 'globe'),
(13, 'Life Insurance', '#059669', 'heart'),
(14, 'Others', '#71717A', 'more-horizontal'),
(15, 'Phone', '#32af37', 'phone'),
(17, 'General Expenses', '#6366F1', 'shopping-cart'),
(29, 'Utilities', '#e91515', 'House-Plug'),
(30, 'Insurances', '#ca6464', 'alarm-smoke');

-- Create bills table
CREATE TABLE bills (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  day INT NOT NULL,
  category_id INT REFERENCES categories(id),
  is_one_time BOOLEAN DEFAULT FALSE NOT NULL,
  is_yearly BOOLEAN DEFAULT FALSE NOT NULL,
  date TIMESTAMP,
  yearly_date TIMESTAMP,
  reminder_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  reminder_days INT DEFAULT 7 NOT NULL
);

-- Insert data into bills table
INSERT INTO bills (id, name, amount, day, category_id, is_one_time, is_yearly, date, yearly_date, reminder_enabled, reminder_days) VALUES
(2, 'ATT Phone Bill ($115 Rund Roaming)', 429, 1, 15, FALSE, FALSE, NULL, NULL, FALSE, 7),
(3, 'Maid Service - Beginning of Month Payment', 120, 1, 5, FALSE, FALSE, NULL, NULL, FALSE, 7),
(4, 'Rent', 3750, 1, 1, FALSE, FALSE, NULL, NULL, FALSE, 7),
(5, 'Sling TV (CC 9550)', 75, 3, 10, FALSE, FALSE, NULL, NULL, FALSE, 7),
(6, 'Cox Internet', 81, 6, 11, FALSE, FALSE, NULL, NULL, FALSE, 7),
(7, 'Water Bill', 80, 7, 9, FALSE, FALSE, NULL, NULL, FALSE, 7),
(8, 'NV Energy Electrical ($100 winter months)', 250, 7, 7, FALSE, FALSE, NULL, NULL, FALSE, 7),
(9, 'TransAmerica Life Insurance', 77, 9, 13, FALSE, FALSE, NULL, NULL, FALSE, 7),
(10, 'Credit Card minimum payments', 225, 14, 6, FALSE, FALSE, NULL, NULL, FALSE, 7),
(11, 'Apple/Google/YouTube (CC 9550)', 130, 14, 12, FALSE, FALSE, NULL, NULL, FALSE, 7),
(12, 'Expenses & Groceries charged on (CC 2647)', 3000, 16, 2, FALSE, FALSE, NULL, NULL, FALSE, 7),
(13, 'Maid Service - Mid-Month Payment', 120, 17, 5, FALSE, FALSE, NULL, NULL, FALSE, 7),
(14, 'SoFi Personal Loan', 1915, 17, 3, FALSE, FALSE, NULL, NULL, FALSE, 7),
(15, 'Southwest Gas ($200 in winter/$45 in summer)', 75, 17, 8, FALSE, FALSE, NULL, NULL, FALSE, 7),
(16, 'Car Insurance for 3 cars ($268 + $169 + $303 + $21)', 704, 28, 4, FALSE, FALSE, NULL, NULL, FALSE, 7);

-- Create transactions table
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date TIMESTAMP NOT NULL,
  type TEXT NOT NULL,
  category_id INT REFERENCES categories(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  recurring_type TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  first_date INT,
  second_date INT,
  day INT
);

-- Insert data into transactions table
INSERT INTO transactions (description, amount, date, type, category_id, created_at, recurring_type, is_recurring, first_date, second_date, day) VALUES
('Water Bill', 80, '2025-02-06T00:00:00.000Z', 'expense', 29, '2025-02-14T07:01:56.328Z', NULL, FALSE, NULL, NULL, NULL),
('NV Energy Electrical ($100 winter months)', 250, '2025-02-06T00:00:00.000Z', 'expense', 29, '2025-02-14T07:01:56.328Z', NULL, FALSE, NULL, NULL, NULL),
('Rent', 3750, '2025-02-01T00:00:00.000Z', 'expense', 1, '2025-02-14T07:01:56.328Z', NULL, FALSE, NULL, NULL, NULL),
('Groceries & Others charged on (CC 2647)', 3000, '2025-02-16T00:00:00.000Z', 'expense', 2, '2025-02-14T07:01:56.328Z', NULL, FALSE, NULL, NULL, NULL),
('AT&T (+$115 Rund Roaming)', 429, '2025-02-01T00:00:00.000Z', 'expense', 15, '2025-02-14T07:01:56.328Z', NULL, FALSE, NULL, NULL, NULL),
('maid''s 2nd Monthly Payment', 120, '2025-02-17T00:00:00.000Z', 'expense', 5, '2025-02-14T07:01:56.328Z', NULL, FALSE, NULL, NULL, NULL),
('maid''s 1st monthly payment', 120, '2025-02-01T00:00:00.000Z', 'expense', 5, '2025-02-14T07:01:56.328Z', NULL, FALSE, NULL, NULL, NULL),
('test monthly income 1', 1, '2025-02-28T00:00:00.000Z', 'income', NULL, '2025-02-19T19:52:23.889Z', 'monthly', TRUE, NULL, NULL, NULL),
('Sling TV (CC 9550)', 75, '2025-02-02T00:00:00.000Z', 'expense', 10, '2025-02-14T07:01:56.328Z', NULL, FALSE, NULL, NULL, NULL),
('Cox Internet', 81, '2025-02-05T00:00:00.000Z', 'expense', 11, '2025-02-14T07:01:56.328Z', NULL, FALSE, NULL, NULL, NULL),
('Credit Card minimum payments', 225, '2025-02-13T00:00:00.000Z', 'expense', 6, '2025-02-14T07:01:56.328Z', NULL, FALSE, NULL, NULL, NULL),
('Apple/Google/YouTube (CC 9550)', 130, '2025-02-13T00:00:00.000Z', 'expense', 12, '2025-02-14T07:01:56.328Z', NULL, FALSE, NULL, NULL, NULL),
('SoFi Personal Loan', 1915, '2025-02-17T00:00:00.000Z', 'expense', 3, '2025-02-14T07:01:56.328Z', NULL, FALSE, NULL, NULL, NULL),
('Car Insurance for 3 cars ($268 + $169 + $303 + $21)', 704, '2025-02-27T00:00:00.000Z', 'expense', 4, '2025-02-14T07:01:56.328Z', NULL, FALSE, NULL, NULL, NULL),
('Southwest Gas ($200 in winter/$45 in summer)', 75, '2025-02-17T00:00:00.000Z', 'expense', 8, '2025-02-14T07:01:56.328Z', NULL, FALSE, NULL, NULL, NULL),
('TransAmerica Life Insurance', 77, '2025-02-08T00:00:00.000Z', 'expense', 13, '2025-02-14T07:01:56.328Z', NULL, FALSE, NULL, NULL, NULL),
('test expense. monthly 1', 1, '2025-02-19T00:00:00.000Z', 'expense', 14, '2025-02-19T22:03:18.612Z', NULL, FALSE, NULL, NULL, 19),
('Majdi''s Salary', 4739, '2025-02-01T00:00:00.000Z', 'income', 17, '2025-02-14T07:01:56.328Z', 'twice-monthly', TRUE, NULL, NULL, NULL),
('Majdi''s Salary', 4739, '2025-02-15T00:00:00.000Z', 'income', 17, '2025-02-14T07:01:56.328Z', 'twice-monthly', TRUE, NULL, NULL, NULL),
('Ruba''s Salary', 2168, '2025-02-07T00:00:00.000Z', 'income', 17, '2025-02-14T07:01:56.328Z', 'biweekly', TRUE, NULL, NULL, NULL),
('Ruba''s Salary', 2168, '2025-02-21T00:00:00.000Z', 'income', 17, '2025-02-14T07:01:56.328Z', 'biweekly', TRUE, NULL, NULL, NULL);
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
