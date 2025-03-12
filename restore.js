import fs from 'fs';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const backupFilePath = '/Users/majdishami/Downloads/budget_tracker_2025-02-20T05-48-39-540Z.json';
const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

const client = new pkg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function restoreData() {
  try {
    await client.connect();

    // Insert Categories
    for (const [name, cat] of Object.entries(backupData.categories)) {
      await client.query(
        `INSERT INTO categories (id, name, color, icon)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [cat.id, name, cat.color, cat.icon]
      );
    }

    // Insert Bills (corrected based on your schema)
    for (const bill of Object.values(backupData.bills)) {
      await client.query(
        `INSERT INTO bills (name, amount, day, category_id, is_one_time, is_yearly, date, yearly_date, reminder_enabled, reminder_days)
         VALUES ($1,$2,$3,(SELECT id FROM categories WHERE name=$4),$5,$6,$7,$8,$9,$10)
         ON CONFLICT DO NOTHING`,
        [
          bill.name, bill.amount, bill.day, bill.category, bill.is_one_time, bill.is_yearly,
          bill.date, bill.yearly_date, bill.reminder_enabled, bill.reminder_days
        ]
      );
    }

    // Insert Transactions
    for (const transaction of backupData.transactions) {
      await client.query(
        `INSERT INTO transactions (id, description, amount, date, type, category_id, created_at, recurring_type, is_recurring, first_date, second_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
        [
          transaction.id, transaction.description, transaction.amount, transaction.date,
          transaction.type, transaction.category_id, transaction.created_at,
          transaction.recurring_type, transaction.is_recurring, transaction.first_date,
          transaction.second_date
        ]
      );
    }

    console.log('✅ Backup restored successfully.');
  } catch (err) {
    console.error('❌ An error occurred:', err);
  } finally {
    await client.end();
  }
}

restoreData();

// Ensure restored transactions maintain recurrence
db.transactions.find().forEach(transaction => {
    if (transaction.recurring_type === 'monthly') {
        transaction.is_recurring = true;
        transaction.frequency_date = new Date(transaction.date).getDate();
        transaction.date = transaction.frequency_date.toString(); // Store only the day for monthly transactions
    }
    db.transactions.save(transaction);
});
