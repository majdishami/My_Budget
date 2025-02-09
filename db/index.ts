import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./schema";
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env file
const envPath = join(process.cwd(), '.env');
config({ path: envPath });

// Create pool configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Only enable SSL in production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
};

// Initialize pool with configuration
const pool = new Pool(poolConfig);

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
  process.exit(-1);
});

const db = drizzle(pool, { schema });

// Enhanced connection testing with retries
async function testConnection(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Connection attempt ${attempt}/${retries}...`);
      const client = await pool.connect();

      try {
        // Basic connectivity test
        await client.query('SELECT NOW()');
        console.log('Database connection established successfully');

        // More specific schema verification
        const tables = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `);

        const tableNames = tables.rows.map(r => r.table_name);
        console.log('Available tables:', tableNames);

        // Verify categories table exists and has correct structure
        if (!tableNames.includes('categories')) {
          throw new Error('Categories table not found in schema');
        }

        // Test query to categories table
        const categoryTest = await client.query('SELECT COUNT(*) FROM categories');
        console.log(`Categories table accessible, contains ${categoryTest.rows[0].count} rows`);

        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt === retries) {
        throw error;
      }
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 10000)));
    }
  }
  return false;
}

// Initialize connection
console.log('Initializing database connection...');
testConnection().catch(error => {
  console.error('Fatal database configuration error:', error);
  process.exit(1);
});

export { db, pool };