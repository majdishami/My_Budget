import pkg from 'pg';
import fs from 'fs';

const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function loadData() {
  await client.connect();

  const data = JSON.parse(fs.readFileSync('budget_tracker_2025-02-20T05-48-39-540Z.json', 'utf8'));

  for (const entry of data) {
    const query = `
      INSERT INTO transactions (description, amount, date, type, category_id, created_at, recurring_type, is_recurring, first_date, second_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    const values = [
      entry.description,
      entry.amount,
      entry.date,
      entry.type,
      entry.category_id,
      entry.created_at,
      entry.recurring_type,
      entry.is_recurring,
      entry.first_date,
      entry.second_date,
    ];

    await client.query(query, values);
  }

  await client.end();
}

loadData().catch(err => console.error('Error loading data:', err));