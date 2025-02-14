import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import syncRouter from "./routes/sync";
import fs from "fs";
import path from "path";
import fileUpload from 'express-fileupload';
import cors from 'cors';
import morgan from 'morgan';
import { db } from "@db";
import { categories } from "@db/schema";
import { sql } from "drizzle-orm";

const app = express();

// Create tmp directory if it doesn't exist
const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced logging middleware using morgan
app.use(morgan('combined'));

// Configure CORS with enhanced security
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      /\.replit\.dev$/,
      "http://localhost:5000",
      "http://localhost:5001"
    ];
    if (!origin || allowedOrigins.some(o => origin.match(o))) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  allowedHeaders: "Content-Type, Authorization"
}));

// Configure file upload middleware with improved security
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
  uploadTimeout: 30000, // 30 seconds
  createParentPath: true,
  defParamCharset: 'utf8',
  responseOnLimit: 'File size limit has been reached',
  parseNested: false
}));

// Enable trust proxy for secure cookies when behind Replit's proxy
app.enable('trust proxy');

// Enhanced request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  log(`[${req.method}] ${path} from ${req.ip}`);
  if (Object.keys(req.query).length > 0) {
    log(`Query params: ${JSON.stringify(req.query)}`);
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    const size = res.get('content-length');
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} ${size || 0}b in ${duration}ms`);
    }
  });

  next();
});

// Register sync routes
app.use(syncRouter);

(async () => {
  try {
    console.log('Starting server initialization...');

    // Test database connection before starting server
    try {
      // Check if we can query the database
      const categoryCount = await db.select({
        count: sql<number>`count(*)`.mapWith(Number)
      }).from(categories);

      console.log('Database connection established successfully');
      console.log('Categories table contains', categoryCount[0]?.count || 0, 'rows');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      process.exit(1);
    }

    // Initialize routes
    const server = registerRoutes(app);

    // Enhanced error handler with better error details
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        code: err.code,
        status: err.status || err.statusCode
      });

      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ 
        message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
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