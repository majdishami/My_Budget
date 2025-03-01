
import { Pool } from 'pg';

// Database connection configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/budget_tracker',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

// Create a PostgreSQL connection pool
export const pool = new Pool(poolConfig);

// Simple query helper
export const query = (text, params) => pool.query(text, params);

// Export the connection pool
export default pool;
