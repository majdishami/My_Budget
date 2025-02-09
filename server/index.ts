import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

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
    origin === 'http://127.0.0.1:5000' ||
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

// Enhanced request logging middleware with detailed information
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson: any, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Enhanced request logging
  log(`[${req.method}] ${path} from ${req.ip}`);
  if (Object.keys(req.query).length > 0) {
    log(`Query params: ${JSON.stringify(req.query)}`);
  }
  if (Object.keys(req.headers).length > 0) {
    log(`Headers: ${JSON.stringify(req.headers)}`);
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = registerRoutes(app);

  // Enhanced global error handler with detailed logging
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Error: ${message}`);
    if (err.stack) {
      log(`Stack: ${err.stack}`);
    }
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use port 5000 as per Replit's configuration
  const PORT = parseInt(process.env.PORT || '5000');
  const HOST = '0.0.0.0';

  server.listen(PORT, HOST, () => {
    log(`Server is running at http://${HOST}:${PORT}`);
    log(`Server environment: ${app.get("env")}`);
    log(`Trust proxy enabled: ${app.get('trust proxy')}`);
    log(`CORS and API endpoints are configured for development`);
  });
})();