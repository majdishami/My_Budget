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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Configure file upload middleware with improved security
app.use(fileUpload({
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  },
  useTempFiles: true,
  tempFileDir: tmpDir,
  debug: false,
  safeFileNames: true,
  preserveExtension: true,
  abortOnLimit: true,
  uploadTimeout: 30000,
  createParentPath: true,
  defCharset: 'utf8',
  defParamCharset: 'utf8'
}));

// Enable trust proxy for secure cookies when behind Replit's proxy
app.enable('trust proxy');

// Enhanced CORS configuration with security headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  // Add security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('X-XSS-Protection', '1; mode=block');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Optimized logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  // Enhanced logging
  if (req.files) {
    const fileInfo = Object.entries(req.files).map(([key, file]) => ({
      fieldname: key,
      size: (file as any).size,
      mimetype: (file as any).mimetype
    }));
    log(`Files received: ${JSON.stringify(fileInfo)}`);
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

    // Enhanced error handler with security considerations
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      const status = err.status || err.statusCode || 500;
      const message = process.env.NODE_ENV === 'production' 
        ? "Internal Server Error" 
        : (err.message || "Internal Server Error");

      const response = process.env.NODE_ENV === 'production' 
        ? { message } 
        : { message, stack: err.stack };

      res.status(status).json(response);
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Use PORT from environment or default to 5000 (Replit's expected port)
    const PORT = process.env.PORT || 5000;
    const HOST = '0.0.0.0';

    console.log('Environment:', app.get("env"));
    console.log('Trust proxy:', app.get('trust proxy'));
    console.log(`Starting server on ${HOST}:${PORT}`);

    server.listen(PORT, HOST, () => {
      console.log(`Server is running at http://${HOST}:${PORT}`);
      console.log(`Server environment: ${app.get("env")}`);
      console.log(`Trust proxy enabled: ${app.get('trust proxy')}`);
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