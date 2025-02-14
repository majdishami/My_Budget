import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import fileUpload from 'express-fileupload';
import cors from 'cors';
import morgan from 'morgan';
import { db } from "@db";
import path from "path";
import fs from "fs";
import * as dotenv from 'dotenv';

// Load environment variables
const envPath = path.join(process.cwd(), '.env');
console.log('Loading environment variables from:', envPath);
dotenv.config({ path: envPath });

// Log database connection config (without sensitive data)
console.log('Database connection config:', {
  connectionString: '[REDACTED]',
  ssl: process.env.DATABASE_SSL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

console.log('Initializing database connection...');

// Initialize express app
console.log('Initializing Express application...');
const app = express();

// Create tmp directory if it doesn't exist
const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) {
  console.log('Creating tmp directory at:', tmpDir);
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Basic middleware setup
console.log('Setting up basic middleware...');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('combined'));

// Configure CORS
console.log('Configuring CORS...');
app.use(cors({
  origin: true,
  credentials: true,
  methods: "GET,POST,PUT,DELETE,OPTIONS,PATCH",
  allowedHeaders: "Content-Type, Authorization"
}));

// Configure file upload middleware
console.log('Setting up file upload middleware...');
app.use(fileUpload({
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  },
  useTempFiles: true,
  tempFileDir: tmpDir,
  debug: process.env.NODE_ENV !== 'production',
  safeFileNames: true,
  preserveExtension: true,
  abortOnLimit: true,
  uploadTimeout: 30000,
  createParentPath: true,
  defParamCharset: 'utf8',
  responseOnLimit: 'File size limit has been reached',
  parseNested: false
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  log(`[${req.method}] ${req.path}`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Initialize database and start server
let connectionAttempts = 0;
const MAX_ATTEMPTS = 5;

(async () => {
  try {
    log('Starting server initialization...');

    // Test database connection with retries
    while (connectionAttempts < MAX_ATTEMPTS) {
      connectionAttempts++;
      console.log(`Connection attempt ${connectionAttempts}/${MAX_ATTEMPTS}...`);

      try {
        await db.query.categories.findMany();
        log('Database connection established successfully');
        break;
      } catch (dbError) {
        console.error('Database connection error:', dbError);
        if (connectionAttempts === MAX_ATTEMPTS) {
          console.error('Maximum connection attempts reached. Exiting...');
          process.exit(1);
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Initialize routes
    console.log('Registering routes...');
    const server = registerRoutes(app);

    // Error handler
    console.log('Setting up error handler...');
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });

      res.status(err.status || 500).json({ 
        message: err.message || "Internal Server Error",
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    });

    console.log('Setting up Vite/Static serving...');
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Server startup configuration
    const port = Number(process.env.PORT || 5000);
    const host = '0.0.0.0';
    console.log(`Attempting to start server on ${host}:${port}...`);

    // Add specific error handler for server startup issues
    server.on('error', (error: any) => {
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

    server.listen(port, host, () => {
      log(`Server running at http://${host}:${port}`);
      log(`Environment: ${app.get("env")}`);
      log('Server initialization completed successfully');

      // Log available tables
      db.query.categories.findMany().then(categories => {
        console.log('Available tables:', Object.keys(db.query));
        console.log('Categories table contains', categories.length, 'rows');
      }).catch(err => {
        console.error('Error querying categories:', err);
      });
    });

  } catch (error) {
    console.error('Fatal error during server initialization:', error);
    process.exit(1);
  }
})();