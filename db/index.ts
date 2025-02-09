import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  max: 20,
  idleTimeoutMillis: 30000,
  ssl: process.env.NODE_ENV === 'production'
});

// Initialize Drizzle with the pool
const db = drizzle(pool, { schema });

// Test the connection
console.log('Testing database connection...');
pool.connect()
  .then(client => {
    client.query('SELECT NOW()')
      .then(result => {
        console.log('Database connection successful:', result.rows[0]);
        client.release();
      })
      .catch(err => {
        console.error('Error executing test query:', err);
        client.release();
      });
  })
  .catch(err => {
    console.error('Error connecting to database:', err);
  });

export { pool, db };