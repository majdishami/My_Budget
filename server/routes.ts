import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users, insertUserSchema } from "@db/schema";
import { eq } from "drizzle-orm";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import crypto from "crypto";

// Hash password using SHA-256
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function registerRoutes(app: Express): Server {
  // Initialize PostgreSQL session store
  const PgSession = ConnectPgSimple(session);

  // Set up session middleware
  app.use(session({
    store: new PgSession({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
    }),
    secret: crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  }));

  // Initialize Passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());

  // Set up Passport Local Strategy
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (!user) {
        return done(null, false, { message: 'Invalid username or password' });
      }

      const hashedPassword = hashPassword(password);
      if (hashedPassword !== user.password) {
        return done(null, false, { message: 'Invalid username or password' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Middleware to check if user is authenticated
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
  };

  // Authentication Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password } = await insertUserSchema.parseAsync(req.body);

      // Check if username already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Create new user
      const hashedPassword = hashPassword(password);
      const [newUser] = await db.insert(users).values({
        username,
        password: hashedPassword,
      }).returning();

      res.status(201).json({ message: 'User created successfully', id: newUser.id });
    } catch (error) {
      res.status(400).json({ message: 'Invalid request' });
    }
  });

  app.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
    res.json({ message: 'Logged in successfully' });
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout(() => {
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Protected route example
  app.get('/api/auth/check', requireAuth, (req, res) => {
    res.json({ authenticated: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}