import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./schema";
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the equivalent of __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
const envPath = resolve(__dirname, '../.env');
console.log('Looking for .env file at:', envPath);

const result = config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

// Enhanced environment variable validation and debugging
function validateEnvVariables() {
  const required = ['DATABASE_URL', 'PGDATABASE', 'PGUSER', 'PGPASSWORD', 'PGHOST', 'PGPORT'];
  const missing = required.filter(key => !process.env[key]);

  // Debug log all environment variables
  console.log('Current environment variables:');
  required.forEach(key => {
    console.log(`${key}: ${process.env[key] ? 'exists' : 'missing'}`);
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}.\n` +
      `Please ensure these are set in your .env file or environment.`
    );
  }

  console.log('Database connection URL validated successfully');
  console.log('Attempting to connect to:', process.env.PGHOST + ':' + process.env.PGPORT);
}

// Validate environment variables
validateEnvVariables();

// Initialize pool with enhanced error handling
const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT as string),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: {
    rejectUnauthorized: false, // Required for Neon and similar hosted PostgreSQL services
    sslmode: 'require'
  },
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