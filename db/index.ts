import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./schema";

// Configure WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Please create a .env file with the DATABASE_URL variable.");
}

// Parse and validate the DATABASE_URL before using it
let databaseUrl: string;
try {
  const url = new URL(process.env.DATABASE_URL);
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

// Initialize pool and db outside try block
const pool = new Pool({ 
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5000,
  max: 20,
  idleTimeoutMillis: 30000,
  ssl: {
    rejectUnauthorized: true
  }
});

const db = drizzle(pool, { schema });

// Test the connection in try block
try {
  console.log('Initializing database connection...');

  console.log('Testing database connection...');
  pool.connect()
    .then(async (client) => {
      try {
        const result = await client.query('SELECT NOW()');
        console.log('Database connection successful:', result.rows[0]);
        client.release();
      } catch (err) {
        console.error('Error executing test query:', err);
        client.release();
      }
    })
    .catch(err => {
      console.error('Error connecting to database:', err);
      if (err.code) {
        console.error('Error code:', err.code);
      }
      if (err.message) {
        console.error('Error message:', err.message);
      }
    });
} catch (error) {
  console.error('Fatal database configuration error:', error);
  throw error;
}

export { pool, db };