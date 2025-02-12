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

// Create pool configuration with improved connection handling
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2000 to 10000
  maxUses: 7500,
  keepAlive: true, // Enable keepalive
  keepAliveInitialDelayMillis: 10000
};

console.log('Database connection config:', {
  ...poolConfig,
  connectionString: poolConfig.connectionString ? '[REDACTED]' : undefined
});

// Initialize pool with configuration
const pool = new Pool(poolConfig);

// Enhanced error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
  if (err.code === '57P01') {
    console.log('Attempting to reconnect after connection termination...');
    // Implement automatic reconnection after a delay
    setTimeout(() => {
      console.log('Attempting to reconnect to database...');
      pool.connect().catch(connectErr => {
        console.error('Reconnection attempt failed:', connectErr);
      });
    }, 5000);
  }
});

// Initialize db connection
const db = drizzle(pool, { schema });

// Enhanced connection testing with better retry logic
async function testConnection(retries = 5) { // Increased retries from 3 to 5
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
        console.error('All connection attempts failed. Please check your database configuration and connectivity.');
        throw error;
      }
      // Exponential backoff with maximum delay of 30 seconds
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      console.log(`Waiting ${delay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

// Initialize connection with better error handling
console.log('Initializing database connection...');
testConnection().catch(error => {
  console.error('Database configuration error:', error);
  // Log additional debugging information
  console.log('Current environment:', process.env.NODE_ENV);
  console.log('Database URL format:', process.env.DATABASE_URL ? 
    process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@') : 'Not set');
});

export { db, pool };