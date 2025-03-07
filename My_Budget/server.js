// Root-level server starter using CommonJS
require('dotenv').config();

// This is a simple wrapper to run the server from server/index.js
console.log('Starting server from server/index.js');
require('./server/index.js');


// Fallback to a simple server
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

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

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running (fallback)' });
});

// Create client build directory if it doesn't exist
const fs = require('fs');
const clientBuildPath = path.join(__dirname, 'client/build');
if (!fs.existsSync(clientBuildPath)) {
  fs.mkdirSync(clientBuildPath, { recursive: true });
  fs.writeFileSync(
    path.join(clientBuildPath, 'index.html'),
    '<html><head><title>Budget Tracker</title></head><body><h1>Budget Tracker App</h1><p>Server is running but client is not built yet</p></body></html>'
  );
}

// Serve static files from the React app
app.use(express.static(clientBuildPath));

// Catch-all handler to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fallback server running on port ${PORT}`);
});