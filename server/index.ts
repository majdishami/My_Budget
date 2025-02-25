import { Pool } from 'pg';
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from './schema';
import { setupAuth } from './auth';
import { registerRoutes } from './routes';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });

// Handle PostgreSQL connection errors
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

        console.log(`Reconnection attempt ${attempt}/${maxAttempts} in ${(delay / 1000).toFixed(1)}s`);

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

// Test database connection
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
      } finally {
        client.release();
      }
      break;
    } catch (error) {
      console.error(`Connection attempt ${attempt} failed:`, error);
      if (attempt === retries) {
        console.error('Max retries reached, unable to establish a database connection.');
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, 2000 * attempt));
    }
  }
}

testConnection();

setupAuth(app);
registerRoutes(app);

// Start the server
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  pool.end();
  process.exit(0);
});