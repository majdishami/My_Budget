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
const PORT = 5001; // Changed to port 5001 as per configuration

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

// Catch-all route to serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export the app and pool for testing
module.exports = { app, pool };