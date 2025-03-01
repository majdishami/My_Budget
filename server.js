
// Root-level server starter using CommonJS
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

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

// Add the API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Create client build directory if it doesn't exist
const fs = require('fs');
const clientBuildPath = path.join(__dirname, 'client/build');
if (!fs.existsSync(clientBuildPath)) {
  fs.mkdirSync(clientBuildPath, { recursive: true });
  // Create a simple index.html in the build folder
  fs.writeFileSync(
    path.join(clientBuildPath, 'index.html'),
    '<html><head><title>Budget Tracker</title></head><body><h1>Server is running but client is not built yet</h1></body></html>'
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
  console.log(`Server running on port ${PORT}`);
});
