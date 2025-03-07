import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./schema";
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedCategories } from './seed';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file using reliable path resolution
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading environment variables from:', envPath);
try {
  const result = config({ path: envPath });

  if (result.error) {
    throw new Error(`Failed to load .env file: ${result.error.message}`);
  }

  console.log('.env file loaded successfully');
} catch (error) {
  console.error('Error loading environment variables:', error);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not defined in .env file.");
  process.exit(1);
}

// Pool configuration with improved connection handling
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

// Initialize pool with configuration
const pool = new Pool(poolConfig);

// Initialize db with Drizzle ORM
const db = drizzle(pool, { schema });

// Add error handling for the pool
pool.on('error', (err: Error & { code?: string }) => {
  const errorContext = {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString()
  };

  switch (err.code) {
    case '57P01': // Admin shutdown
    case '57P02': // Crash shutdown
    case '57P03': // Cannot connect now
      let attempt = 0;
      const maxAttempts = 5;
      const maxDelay = 30000;

      const reconnect = () => {
        if (attempt >= maxAttempts) {
          console.error(`Connection failed after ${maxAttempts} attempts, shutting down:`, errorContext);
          process.nextTick(() => process.exit(1));
          return;
        }

        attempt++;
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, maxDelay);

        console.log(`Reconnection attempt ${attempt}/${maxAttempts} in ${(delay/1000).toFixed(1)}s`);

        setTimeout(async () => {
          try {
            const client = await pool.connect();
            console.log(`Reconnected successfully on attempt ${attempt}`);
            client.release();
            attempt = 0;
          } catch (error) {
            console.error(`Reconnection failed (attempt ${attempt}/${maxAttempts})`, {
              message: error instanceof Error ? error.message : 'Unknown error',
              nextRetry: Math.min(1000 * Math.pow(2, attempt + 1), maxDelay) / 1000,
              timestamp: new Date().toISOString()
            });
            reconnect();
          }
        }, delay);
      };

      reconnect();
      break;

    case '08006': // Connection failure
    case '08001': // Unable to establish connection
      console.error('Fatal connection error:', errorContext);
      process.nextTick(() => process.exit(1));
      break;

    default:
      console.error('Database error:', errorContext);
      break;
  }
});

// Enhanced connection testing with concise logging
async function testConnection(retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT NOW()');
        console.log('Database connection established');

        const tables = await client.query(`
          SELECT COUNT(*) as table_count 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE';
        `);

        const categoryCount = await client.query('SELECT COUNT(*) FROM categories');
        console.log(`Database status: ${tables.rows[0].table_count} tables, ${categoryCount.rows[0].count} categories`);

        if (parseInt(categoryCount.rows[0].count) === 0) {
          console.log('Initializing default categories...');
          await seedCategories();
        }

        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
      console.log(`Connection retry ${attempt}/${retries} in ${(delay/1000).toFixed(1)}s`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

// Initialize connection
console.log('Initializing database connection...');
testConnection().catch(error => {
  console.error('Database configuration error:', {
    message: error instanceof Error ? error.message : 'Unknown error',
    code: (error as any)?.code,
    stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined,
    timestamp: new Date().toISOString()
  });

  process.nextTick(() => process.exit(1));
});

export { db, pool };