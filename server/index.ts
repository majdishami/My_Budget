import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import path from 'path';
import session from 'express-session';
import pool from '../db';
import { setupAuth } from './auth';
import { registerRoutes } from './routes';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Configure session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'budget_tracker_default_secret',
  resave: false,
  saveUninitialized: false
}));

// Add a basic route for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Setup minimal auth (without dependencies on Drizzle)
setupAuth(app);

// Register API routes
const server = registerRoutes(app);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/build/index.html'));
  });
}

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  pool.end();
  process.exit(0);
});

// Test database connection (unchanged from original)
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