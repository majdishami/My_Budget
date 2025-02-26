import pkg from 'pg';
import fs from 'fs';

const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function loadData(file: string) {
  await client.connect();

  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  if (!Array.isArray(data.transactions)) {
    throw new Error("JSON data is not an array");
  }

  for (const entry of data.transactions) {
    const query = `
      INSERT INTO transactions (description, amount, date, type, category_id, created_at, recurring_type, is_recurring, first_date, second_date, day)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
      entry.day
    ];

    await client.query(query, values);
  }

  await client.end();
}

async function main() {
  try {
    await loadData('budget_tracker_part1_2025-02-20T05-48-39-540Z.json');
    await loadData('budget_tracker_part2_2025-02-20T05-48-39-540Z.json');
    console.log('Data loaded successfully.');
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

main();