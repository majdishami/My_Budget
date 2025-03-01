// Server entry point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const { Pool } = require('pg');
const session = require('express-session');
const fs = require('fs');


// Create Express app
const app = express();
const PORT = process.env.PORT || 5000; // Use environment variable or fallback to 5000

// Create PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/budget_tracker',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      console.log('Database connection established:', result.rows[0]);

      // Check if tables exist
      const tables = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);

      console.log('Available tables:', tables.rows.map(row => row.table_name).join(', '));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection error:', error.message);
    // Continue server startup even if DB fails
  }
}

// Test connection but don't stop server startup if it fails
testConnection();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Add session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'budget_tracker_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API Routes
app.get('/api/categories', async (req, res) => {
  try {
    console.log("[Categories API] Fetching categories...");
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    const allCategories = result.rows;
    console.log("[Categories API] Found categories:", allCategories.length);
    return res.json(allCategories);
  } catch (error) {
    console.error("[Categories API] Error:", error);
    return res.status(500).json({
      message: "Failed to load categories",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    console.log("[Categories API] Creating new category:", req.body);
    const { name, color, icon } = req.body;

    const result = await pool.query(
      'INSERT INTO categories (name, color, icon) VALUES ($1, $2, $3) RETURNING *',
      [name, color, icon]
    );

    const newCategory = result.rows[0];
    console.log("[Categories API] Created category:", newCategory);
    res.status(201).json(newCategory);
  } catch (error) {
    console.error("[Categories API] Error creating category:", error);
    res.status(400).json({
      message: error.message || "Invalid request data",
    });
  }
});

app.get("/api/bills", async (req, res) => {
  try {
    console.log("[Bills API] Fetching bills with categories...");

    const query = `
      SELECT b.id, b.name, b.amount, b.day, b.category_id,
             c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM bills b
      LEFT JOIN categories c ON b.category_id = c.id
    `;

    const result = await pool.query(query);

    const formattedBills = result.rows.map(bill => ({
      id: bill.id,
      name: bill.name,
      amount: Number(bill.amount),
      day: bill.day,
      category_id: bill.category_id,
      category_name: bill.category_name || "General Expenses",
      category_color: bill.category_color || "#6366F1",
      category_icon: bill.category_icon || "shopping-cart",
    }));

    console.log("[Bills API] Found bills:", formattedBills.length);

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    return res.json(formattedBills);
  } catch (error) {
    console.error("[Bills API] Error:", error);
    return res.status(500).json({
      message: "Failed to load bills",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
});

app.get("/api/transactions", async (req, res) => {
  try {
    console.log("[Transactions API] Fetching transactions...");

    const query = `
      SELECT t.id, t.amount, t.date, t.description, t.type, t.category_id,
             c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.date DESC
    `;

    const result = await pool.query(query);

    const formattedTransactions = result.rows.map(transaction => ({
      id: transaction.id,
      amount: Number(transaction.amount),
      date: transaction.date,
      description: transaction.description,
      type: transaction.type,
      category_id: transaction.category_id,
      category_name: transaction.category_name || "General Expenses",
      category_color: transaction.category_color || "#6366F1",
      category_icon: transaction.category_icon || "shopping-cart",
    }));

    console.log("[Transactions API] Found transactions:", formattedTransactions.length);

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    return res.json(formattedTransactions);
  } catch (error) {
    console.error("[Transactions API] Error:", error);
    return res.status(500).json({
      message: "Failed to load transactions",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
});


// Check for client build directory and serve static files
const clientBuildPath = path.join(__dirname, '../client/build');
const clientDistPath = path.join(__dirname, '../client/dist');

// Check if build directory exists, otherwise check for dist directory (vite build)
let staticPath;
if (fs.existsSync(clientBuildPath)) {
  staticPath = clientBuildPath;
} else if (fs.existsSync(clientDistPath)) {
  staticPath = clientDistPath;
} else {
  console.warn("Client build directory not found. Serving a placeholder.");
  fs.mkdirSync(clientBuildPath, { recursive: true });
  fs.writeFileSync(
    path.join(clientBuildPath, 'index.html'),
    '<html><head><title>Budget Tracker</title></head><body><h1>Budget Tracker App</h1><p>Client build not found.</p></body></html>'
  );
  staticPath = clientBuildPath;
}

app.use(express.static(staticPath));

// Log all routes for debugging
app.use((req, res, next) => {
  if (!req.path.includes('/assets/') && !req.path.includes('.')) {
    console.log(`Route requested: ${req.method} ${req.path}`);
  }
  next();
});

// Always serve the client app for any route not caught by API routes
app.get('*', (req, res) => {
  console.log(`Serving index.html for route: ${req.path}`);
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Start server - kill any existing processes before starting
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Try different ports if the primary one is in use
let currentPort = PORT;
const maxPortAttempts = 3;
let portAttempt = 0;

function startServer(port) {
  return app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
    console.log(`View your app at: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE' && portAttempt < maxPortAttempts) {
      portAttempt++;
      const nextPort = 3000 + portAttempt;
      console.error(`ERROR: Port ${port} is already in use.`);
      console.log(`Trying alternate port ${nextPort}...`);
      currentPort = nextPort;
      return startServer(nextPort);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

const server = startServer(currentPort);

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export the app and pool for testing
module.exports = { app, pool, server };