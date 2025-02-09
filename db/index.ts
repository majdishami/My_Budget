import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./schema";
import 'dotenv/config';

// Configure WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

// Enhanced environment variable validation
function validateEnvVariables() {
  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}.\n` +
      `Please ensure these are set in your .env file or environment.`
    );
  }
}

// Validate environment variables
validateEnvVariables();

// Parse and validate the DATABASE_URL before using it
let databaseUrl: string;
try {
  const url = new URL(process.env.DATABASE_URL!);
  if (!url.protocol || !url.host || !url.pathname) {
    throw new Error('Invalid database URL format');
  }
  databaseUrl = process.env.DATABASE_URL;
  console.log('Database connection URL validated successfully');
  console.log('Attempting to connect to:', url.host);
} catch (error) {
  console.error('Invalid DATABASE_URL format:', error);
  throw new Error('Please provide a valid postgres:// connection URL');
}

// Initialize pool with enhanced error handling
const pool = new Pool({ 
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5000,
  max: 20,
  idleTimeoutMillis: 30000,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true
  } : false
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