import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./schema";
import { config } from 'dotenv';
import { join } from 'path';
import { seedCategories } from './seed';

// Load environment variables from .env file
const envPath = join(process.cwd(), '.env');
console.log('Loading environment variables from:', envPath);
config({ path: envPath });

// Create pool configuration with better defaults
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait for a connection
  maxUses: 7500, // number of times a connection can be used before being destroyed
};

console.log('Database connection config:', {
  ...poolConfig,
  connectionString: poolConfig.connectionString ? '[REDACTED]' : undefined
});

// Initialize pool with configuration
const pool = new Pool(poolConfig);

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
  // Don't exit the process, just log the error
  if (err.code === '57P01') {
    console.log('Attempting to reconnect after connection termination...');
  }
});

// Initialize db connection
const db = drizzle(pool, { schema });

// Simplified connection testing
async function testConnection(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Connection attempt ${attempt}/${retries}...`);
      const client = await pool.connect();

      try {
        await client.query('SELECT NOW()');
        console.log('Database connection established successfully');

        const tables = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `);

        console.log('Available tables:', tables.rows.map(r => r.table_name));

        const categoryCount = await client.query('SELECT COUNT(*) FROM categories');
        console.log(`Categories table contains ${categoryCount.rows[0].count} rows`);

        if (parseInt(categoryCount.rows[0].count) === 0) {
          console.log('No categories found, seeding default categories...');
          await seedCategories();
        }

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
  // Don't exit process on connection error, allow for retry
  console.log('Connection error occurred, but server will continue running to allow for recovery');
});

export { db, pool };