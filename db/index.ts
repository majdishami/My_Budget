import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not defined in .env file.");
  process.exit(1);
}

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

export const pool = new Pool(poolConfig);

export const db = drizzle(pool, { schema });

pool.on('error', (err: Error & { code?: string }) => {
  const errorContext = {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString()
  };

  switch (err.code) {
    case '57P01':
    case '57P02':
    case '57P03':
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

    default:
      console.error('Database error:', errorContext);
      break;
  }
});

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
        client.release();
        return true;
      } catch (queryError) {
        console.error('Query error:', queryError);
        client.release();
      }
    } catch (connectionError) {
      console.error('Connection error:', connectionError);
    }
  }
  return false;
}

testConnection();