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

// Try to load native bindings
let nativeBindings;
if (process.env.NODE_ENV === 'production') {
  try {
    nativeBindings = require('pg-native');
    console.log('Successfully loaded pg-native bindings for improved performance');
  } catch (error) {
    console.warn('pg-native bindings not available, falling back to pure JavaScript driver:', error.message);
  }
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
  keepAliveInitialDelayMillis: 10000,
  // Use native bindings in production if available
  ...(nativeBindings && { Client: nativeBindings })
};

console.log('Database connection config:', {
  ...poolConfig,
  connectionString: poolConfig.connectionString ? '[REDACTED]' : undefined,
  usingNative: !!nativeBindings
});

// Initialize pool with configuration
const pool = new Pool(poolConfig);

// Enhanced error handling for the pool
pool.on('error', (err: Error & { code?: string }) => {
  // Log detailed error information
  const errorContext = {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    poolConfig: {
      max: poolConfig.max,
      idleTimeoutMillis: poolConfig.idleTimeoutMillis,
      connectionTimeoutMillis: poolConfig.connectionTimeoutMillis
    }
  };

  console.error('Unexpected error on idle client:', errorContext);

  // Handle specific PostgreSQL error codes with detailed logging
  switch (err.code) {
    case '57P01': // Admin shutdown
    case '57P02': // Crash shutdown
    case '57P03': // Cannot connect now
      console.log('Database connection terminated, attempting to reconnect...', {
        errorCode: err.code,
        errorType: 'connection_terminated',
        timestamp: new Date().toISOString()
      });

      let attempt = 0;
      const maxAttempts = 5;
      const maxDelay = 30000; // Maximum delay of 30 seconds

      const reconnect = () => {
        if (attempt >= maxAttempts) {
          console.error('Max reconnection attempts reached, initiating graceful shutdown:', {
            totalAttempts: attempt,
            lastError: err.message,
            timestamp: new Date().toISOString()
          });

          process.nextTick(() => process.exit(1));
          return;
        }

        attempt++;
        const baseDelay = Math.min(1000 * Math.pow(2, attempt), maxDelay);
        const jitter = Math.random() * 1000;
        const delay = Math.min(baseDelay + jitter, maxDelay);

        console.log('Attempting reconnection:', {
          attempt: `${attempt}/${maxAttempts}`,
          delay: `${(delay/1000).toFixed(1)}s`,
          timestamp: new Date().toISOString()
        });

        setTimeout(async () => {
          try {
            const client = await pool.connect();
            console.log('Successfully reconnected to database', {
              attempt,
              timestamp: new Date().toISOString()
            });
            client.release();
            attempt = 0;
          } catch (error) {
            console.error('Reconnection attempt failed:', {
              message: error instanceof Error ? error.message : 'Unknown error',
              attempt,
              nextRetryIn: Math.min(1000 * Math.pow(2, attempt + 1), maxDelay) / 1000,
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
      console.error('Fatal connection error:', {
        ...errorContext,
        errorType: 'connection_failure'
      });
      process.nextTick(() => process.exit(1));
      break;

    default:
      console.error('Unhandled database error:', {
        ...errorContext,
        errorType: 'unhandled'
      });
      break;
  }
});

// Initialize db connection
const db = drizzle(pool, { schema });

// Enhanced connection testing with better retry logic and exponential backoff
async function testConnection(retries = 5) {
  const maxDelay = 30000; // Maximum delay of 30 seconds

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Connection attempt ${attempt}/${retries}...`);
      const client = await pool.connect();

      try {
        // Basic connectivity test
        await client.query('SELECT NOW()');
        console.log('Database connection established successfully');

        // Schema verification
        const tables = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `);

        console.log('Available tables:', tables.rows.map(r => r.table_name));

        // Verify and seed categories if needed
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
      console.error(`Attempt ${attempt} failed:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
      });

      if (attempt === retries) {
        throw error;
      }

      // Exponential backoff with jitter and maximum delay
      const baseDelay = Math.min(1000 * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
      const delay = Math.min(baseDelay + jitter, maxDelay);

      console.log(`Waiting ${Math.round(delay)}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

// Initialize connection with improved error handling and graceful shutdown
console.log('Initializing database connection...');
testConnection().catch(error => {
  // Log detailed error information
  console.error('Fatal database configuration error:', {
    message: error instanceof Error ? error.message : 'Unknown error',
    code: (error as any)?.code,
    stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
  });

  // Log additional debugging information
  console.log('Current environment:', process.env.NODE_ENV);
  console.log('Database URL format:', process.env.DATABASE_URL ? 
    process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@') : 'Not set');

  // Initiate graceful shutdown
  console.log('Initiating graceful shutdown...');

  // Allow pending logs to be written before exiting
  process.nextTick(() => {
    console.log('Shutting down application...');
    process.exit(1);
  });
});

export { db, pool };