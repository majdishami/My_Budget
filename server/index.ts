
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import path from 'path';
import session from 'express-session';
import { setupAuth } from './auth';
import { registerRoutes } from './routes';
import pool from '../db';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Basic session setup with a fallback secret
app.use(session({
  secret: process.env.SESSION_SECRET || 'budget_tracker_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Add a basic route for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Setup auth with minimal configuration
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

// Test database connection
async function testConnection(retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT NOW()');
        console.log('Database connection established');
        
        // Check tables
        const tables = await client.query(`
          SELECT COUNT(*) as table_count 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE';
        `);
        console.log(`Database has ${tables.rows[0].table_count} tables`);
      } finally {
        client.release();
      }
      break;
    } catch (error) {
      console.error(`Connection attempt ${attempt} failed:`, error.message);
      if (attempt === retries) {
        console.error('Max retries reached, unable to establish database connection');
      }
      await new Promise(res => setTimeout(res, 2000));
    }
  }
}

testConnection();

export default app;
