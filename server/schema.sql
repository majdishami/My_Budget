CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7),
  icon VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS bills (
  id INT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2),
  day INT,
  category VARCHAR(255),
  is_one_time BOOLEAN,
  is_yearly BOOLEAN,
  date DATE,
  yearly_date DATE,
  reminder_enabled BOOLEAN,
  reminder_days INT
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT PRIMARY KEY,
  description VARCHAR(255),
  amount DECIMAL(10, 2),
  date DATE,
  type VARCHAR(50),
  category_id INT,
  created_at TIMESTAMP,
  recurring_type VARCHAR(50),
  is_recurring BOOLEAN,
  first_date DATE,
  second_date DATE
);