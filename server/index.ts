import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import path from 'path';
import session from 'express-session';
import { setupAuth } from './auth';
import { registerRoutes } from './routes';
import pg from 'pg';

// Load environment variables
dotenv.config();

// Create PostgreSQL pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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

// Add session middleware with a basic secret
app.use(session({
  secret: process.env.SESSION_SECRET || 'budget_tracker_secret',
  resave: false,
  saveUninitialized: false,
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

export default app;