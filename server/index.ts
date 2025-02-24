<<<<<<< Tabnine <<<<<<<
import pkg from 'pg';//-
const { Pool } = pkg;//-
import drizzle from 'drizzle-orm';//-
import { schema } from './schema';//-
import { setupAuth } from './auth';//-
import { registerRoutes } from './routes';//-
import express from 'express';//-
import dotenv from 'dotenv';//-
import express from "express";//+
import { createServer } from "http";//+
import { drizzle } from "./db";//+
import schema from "./schema";//+
import apiRouter from "./routes/api";//+
import syncRouter from "./routes/sync";//+

dotenv.config();//-
const app = express();//+
const httpServer = createServer(app);//+

if (!process.env.DATABASE_URL) {//-
  console.error("ERROR: DATABASE_URL is not defined in .env file.");//-
  process.exit(1);//-
}//-
app.use(express.json());//+
app.use(express.urlencoded({ extended: true }));//+

// Pool configuration with improved connection handling//-
const poolConfig = {//-
  connectionString: process.env.DATABASE_URL,//-
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,//-
  max: 20,//-
  idleTimeoutMillis: 30000,//-
  connectionTimeoutMillis: 10000,//-
  maxUses: 7500,//-
  keepAlive: true,//-
  keepAliveInitialDelayMillis: 10000//-
};//-
//-
// Initialize pool with configuration//-
const pool = new Pool(poolConfig);//-
//-
// Initialize db with Drizzle ORM//-
const db = drizzle(pool, { schema });//-
//-
// Add error handling for the pool//-
pool.on('error', (err: Error & { code?: string }) => {//-
  const errorContext = {//-
    message: err.message,//-
    code: err.code,//-
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,//-
    timestamp: new Date().toISOString()//-
  };//-
//-
  switch (err.code) {//-
    case '57P01': // Admin shutdown//-
    case '57P02': // Crash shutdown//-
    case '57P03': // Cannot connect now//-
      let attempt = 0;//-
      const maxAttempts = 5;//-
      const maxDelay = 30000;//-
//-
      const reconnect = () => {//-
        if (attempt >= maxAttempts) {//-
          console.error(`Connection failed after ${maxAttempts} attempts, shutting down:`, errorContext);//-
          process.nextTick(() => process.exit(1));//-
          return;//-
        }//-
//-
        attempt++;//-
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, maxDelay);//-
//-
        console.log(`Reconnection attempt ${attempt}/${maxAttempts} in ${(delay / 1000).toFixed(1)}s`);//-
//-
        setTimeout(async () => {//-
          try {//-
            const client = await pool.connect();//-
            console.log(`Reconnected successfully on attempt ${attempt}`);//-
            client.release();//-
            attempt = 0;//-
          } catch (error) {//-
            console.error(`Reconnection failed (attempt ${attempt}/${maxAttempts})`, {//-
              message: error instanceof Error ? error.message : 'Unknown error',//-
              nextRetry: Math.min(1000 * Math.pow(2, attempt + 1), maxDelay) / 1000,//-
              timestamp: new Date().toISOString()//-
            });//-
            reconnect();//-
          }//-
        }, delay);//-
      };//-
//-
      reconnect();//-
      break;//-
//-
    case '08006': // Connection failure//-
    case '08001': // Unable to establish connection//-
      console.error('Fatal connection error:', errorContext);//-
      process.nextTick(() => process.exit(1));//-
      break;//-
//-
    default://-
      console.error('Database error:', errorContext);//-
      break;//-
  }//-
const db = new drizzle(httpServer, {//+
  schema,//+
});

// Enhanced connection testing with concise logging//-
async function testConnection(retries = 5) {//-
  for (let attempt = 1; attempt <= retries; attempt++) {//-
    try {//-
      const client = await pool.connect();//-
      try {//-
        await client.query('SELECT NOW()');//-
        console.log('Database connection established');//-
app.use("/api", apiRouter);//+
app.use("/api", syncRouter);//+

        const tables = await client.query(`//-
          SELECT COUNT(*) as table_count //-
          FROM information_schema.tables //-
          WHERE table_schema = 'public' //-
          AND table_type = 'BASE TABLE';//-
        `);//-
//-
        const categoryCount = await client.query('SELECT COUNT(*) FROM categories');//-
        console.log(`Database status: ${tables.rows[0].table_count} tables, ${categoryCount.rows[0].count} categories`);//-
      } finally {//-
        client.release();//-
      }//-
      break; // Exit loop on success//-
    } catch (error) {//-
      console.error(`Connection attempt ${attempt} failed:`, error);//-
      if (attempt === retries) {//-
        console.error('Max retries reached, unable to establish a database connection.');//-
        process.exit(1);//-
      }//-
      await new Promise(res => setTimeout(res, 2000 * attempt)); // Exponential backoff//-
    }//-
  }//-
}//-
//-
testConnection();//-
//-
const app = express();//-
setupAuth(app);//-
registerRoutes(app);//-
//-
const PORT = process.env.PORT || 3000;//-
app.listen(PORT, () => {//-
  console.log(`Server is running on port ${PORT}`);//-
});//-
export default httpServer;//+
>>>>>>> Tabnine >>>>>>>// {"source":"chat"}