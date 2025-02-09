import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

(async () => {
  try {
    console.log('Starting server initialization...');
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
    let PORT = parseInt(process.env.PORT || (isReplit ? '5000' : '5001'));
    const HOST = '0.0.0.0';

    // Handle cleanup and port conflicts
    function startServer(retryPort = false) {
      if (retryPort) {
        PORT += 1;
      }

      const httpServer = createServer(app);

      httpServer.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          console.log(`Port ${PORT} is in use, trying ${PORT + 1}`);
          httpServer.close();
          startServer(true);
        } else {
          console.error('Server error:', error);
          process.exit(1);
        }
      });

      httpServer.listen(PORT, HOST, () => {
        console.log(`Server is running at http://${HOST}:${PORT}`);
        console.log(`Server environment: ${app.get("env")}`);
        console.log(`Trust proxy enabled: ${app.get('trust proxy')}`);
        console.log(`CORS and API endpoints are configured for ${isReplit ? 'Replit' : 'local'} development`);
      });

      // Handle graceful shutdown
      process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        httpServer.close(() => {
          console.log('HTTP server closed');
          process.exit(0);
        });
      });
    }

    startServer();

  } catch (error) {
    console.error('Fatal error during server initialization:', error);
    process.exit(1);
  }
})();