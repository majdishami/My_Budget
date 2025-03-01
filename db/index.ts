
import { drizzle } from 'drizzle-orm/postgres-js';
import { Pool } from 'pg';
import * as schema from './schema';

// Database connection configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/budget_tracker',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

// Create a PostgreSQL connection pool
export const pool = new Pool(poolConfig);

// Create a drizzle instance
export const db = drizzle(pool, { schema });

// Export the schema
export * from './schema';
export default db;
