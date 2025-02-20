import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Read the backup file
const backupFilePath = path.join(__dirname, '../budget_tracker_2025-02-20T05-48-39-540Z.json');
const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

// Database connection configuration
const client = new Client({
  connectionString: 'postgres://localhost:5432/my_budget',
  ssl: false // Disable SSL
});

async function populateDatabase() {
  try {
    await client.connect();

    // Insert categories
    for (const [name, category] of Object.entries(backupData.categories)) {
      await client.query(
        'INSERT INTO categories (id, name, color, icon) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        [category.id, name, category.color, category.icon]
      );
    }

    // Insert bills
    for (const [id, bill] of Object.entries(backupData.bills)) {
      await client.query(
        'INSERT INTO bills (id, name, amount, day, category, is_one_time, is_yearly, date, yearly_date, reminder_enabled, reminder_days) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING',
        [id, bill.name, bill.amount, bill.day, bill.category, bill.is_one_time, bill.is_yearly, bill.date, bill.yearly_date, bill.reminder_enabled, bill.reminder_days]
      );
    }

    // Insert transactions
    for (const transaction of backupData.transactions) {
      await client.query(
        'INSERT INTO transactions (id, description, amount, date, type, category_id, created_at, recurring_type, is_recurring, first_date, second_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING',
        [transaction.id, transaction.description, transaction.amount, transaction.date, transaction.type, transaction.category_id, transaction.created_at, transaction.recurring_type, transaction.is_recurring, transaction.first_date, transaction.second_date]
      );
    }

    console.log('Database populated successfully!');
  } catch (err) {
    console.error('Error populating the database:', err);
  } finally {
    await client.end();
  }
}

populateDatabase();