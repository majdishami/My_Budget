
// Root-level server starter using CommonJS
// Load environment variables
require('dotenv').config();

// Since we're using ES modules in package.json, we need a different approach
// to load the server
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3030;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));

// API endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Catch-all handler to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
