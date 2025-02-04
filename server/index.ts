import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable trust proxy for secure cookies when behind Replit's proxy
app.enable('trust proxy');

// Configure CORS for Replit's environment
app.use((req, res, next) => {
  // Allow the current Replit domain and localhost for development
  const origin = req.headers.origin;
  if (origin && (
    origin.endsWith('.replit.dev') || 
    origin === 'http://localhost:80'
  )) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  log(`Incoming ${req.method} ${req.path} from ${req.ip}`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  const server = registerRoutes(app);

  // Global error handler
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

  // Use only port 80 as required by deployment
  const PORT = 80;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Server is running at http://0.0.0.0:${PORT}`);
    log(`Server environment: ${app.get("env")}`);
  });
})();