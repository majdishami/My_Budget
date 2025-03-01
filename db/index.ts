import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
};

// Create a PostgreSQL connection pool
const pool = new Pool(poolConfig);

// Export query helper function with proper TypeScript types
export const query = (text: string, params: any[] = []) => pool.query(text, params);

// Export the pool for direct access
export const db = pool;

// For backwards compatibility with both import syntaxes
export default pool;

// Handle errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Database connection established successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('Error connecting to the database:', error);
    return false;
  }
};