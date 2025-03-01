import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test the connection during initialization
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Database connection successful');
  }
});

// Export the pool for direct access
export const db = pool;

// For backwards compatibility with both import syntaxes
export default pool;

// Handle errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});