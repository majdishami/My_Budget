import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import syncRouter from "./routes/sync";
import fs from "fs";
import path from "path";
import fileUpload from 'express-fileupload';

const app = express();

// Create tmp directory if it doesn't exist
const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure file upload middleware
app.use(fileUpload({
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  },
  useTempFiles: true,
  tempFileDir: tmpDir,
  debug: true, // Enable debug mode
  safeFileNames: true,
  preserveExtension: true,
  abortOnLimit: true,
  uploadTimeout: 30000, // 30 seconds
}));

// Enable trust proxy for secure cookies when behind Replit's proxy
app.enable('trust proxy');

// Enhanced CORS configuration for both Replit and local development
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow Replit domains, localhost, and local development ports
  if (origin && (
    origin.endsWith('.replit.dev') || 
    origin === 'http://localhost:5000' ||
    origin === 'http://localhost:5001' ||
    origin === 'http://127.0.0.1:5000' ||
    origin === 'http://127.0.0.1:5001' ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:')
  )) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Enhanced request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  if (req.files) {
    console.log('Files received:', Object.keys(req.files));
  }

  log(`[${req.method}] ${path} from ${req.ip}`);
  if (Object.keys(req.query).length > 0) {
    log(`Query params: ${JSON.stringify(req.query)}`);
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Register sync routes
app.use(syncRouter);

(async () => {
  try {
    console.log('Starting server initialization...');

    // Initialize routes
    const server = registerRoutes(app);

    // Enhanced error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Use different ports for Replit vs local development
    const isReplit = process.env.REPL_ID !== undefined;
    const PORT = parseInt(process.env.PORT || (isReplit ? '5000' : '5001'));
    const HOST = '0.0.0.0';

    // Add graceful startup logging
    console.log('Environment:', app.get("env"));
    console.log('Trust proxy:', app.get('trust proxy'));
    console.log(`Starting server on ${HOST}:${PORT}`);

    server.listen(PORT, HOST, () => {
      console.log(`Server is running at http://${HOST}:${PORT}`);
      console.log(`Server environment: ${app.get("env")}`);
      console.log(`Trust proxy enabled: ${app.get('trust proxy')}`);
      console.log(`CORS and API endpoints are configured for ${isReplit ? 'Replit' : 'local'} development`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Fatal error during server initialization:', error);
    process.exit(1);
  }
})();