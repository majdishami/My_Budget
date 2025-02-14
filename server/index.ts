import express from "express";
import { createServer } from "http";
import cors from "cors";

// Initialize express app
console.log('Starting Express application initialization...');
const app = express();

// Basic middleware
console.log('Setting up middleware...');
app.use(express.json());
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Basic test route
console.log('Setting up test route...');
app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send('Hello World!');
});

app.get('/api/health', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize server
console.log('Creating HTTP server...');
const server = createServer(app);

// Server startup
const port = 5000; // Fixed port to match Replit configuration
const host = '0.0.0.0';

console.log(`Attempting to start server on ${host}:${port}...`);

// Add a timeout to ensure we can detect if the server fails to start
const startupTimeout = setTimeout(() => {
  console.error('Server startup timeout - failed to start within 5 seconds');
  process.exit(1);
}, 5000);

server.listen(port, host, () => {
  clearTimeout(startupTimeout);
  console.log(`Server running at http://${host}:${port}`);
  console.log(`Environment: ${app.get("env")}`);

  // Log all routes for debugging
  console.log('Registered routes:');
  app._router.stack.forEach((r: any) => {
    if (r.route && r.route.path) {
      console.log(`${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
    }
  });
});

// Handle startup errors
server.on('error', (error: any) => {
  clearTimeout(startupTimeout);
  console.error('Server startup error:', error);
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      console.error(`Port ${port} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`Port ${port} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});