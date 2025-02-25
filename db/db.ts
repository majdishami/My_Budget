// db/db.ts
import { Pool } from 'pg';
import { drizzle } from "drizzle-orm/node-postgres";
import { categories, transactions, bills } from './schema';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

const db = drizzle(pool, {
  schema: {
    categories,
    transactions,
    bills,
  },
});

export { db };