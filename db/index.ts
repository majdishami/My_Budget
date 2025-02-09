import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./schema";
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env file
const envPath = join(process.cwd(), '.env');
console.log('Looking for .env file at:', envPath);

const result = config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

// Log database connection details (without sensitive information)
const dbUrl = new URL(process.env.DATABASE_URL || 'postgresql://localhost');
console.log('Connecting to database:', {
  host: dbUrl.hostname,
  port: dbUrl.port,
  database: dbUrl.pathname.substring(1),
  ssl: dbUrl.hostname === 'localhost' ? 'disabled' : 'enabled'
});

// Initialize pool with environment-aware SSL configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: dbUrl.hostname !== 'localhost' ? {
    rejectUnauthorized: false
  } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const db = drizzle(pool, { schema });

// Test the connection
async function testConnection() {
  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      console.log('Database connection successful:', result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error connecting to database:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

// Initialize connection
console.log('Initializing database connection...');
testConnection().catch(error => {
  console.error('Fatal database configuration error:', error);
  process.exit(1);
});

export { pool, db };