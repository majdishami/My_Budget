import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { categories, users, bills, insertUserSchema, insertCategorySchema } from "@db/schema";
import { eq } from "drizzle-orm";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import crypto from "crypto";
import { sql } from 'drizzle-orm';
import pkg from 'pg';
const { Pool } = pkg;

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

  // Test route for auth status
  app.get('/api/auth/status', (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? { id: (req.user as any).id } : null
    });
  });

  // Initialize a database pool for raw queries
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : undefined
  });

  // Categories Routes with simplified implementation
  app.get('/api/categories', async (req, res) => {
    // Set CORS headers for all environments
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Content-Type', 'application/json');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    let client;
    try {
      client = await pool.connect();
      console.log('[Categories API] Database connection established');

      const result = await client.query('SELECT * FROM categories ORDER BY id');
      console.log('[Categories API] Found categories:', result.rows.length);

      return res.json(result.rows);
    } catch (error) {
      console.error('[Categories API] Error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown database error';

      return res.status(500).json({
        message: 'Failed to load categories',
        error: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    } finally {
      if (client) {
        client.release();
        console.log('[Categories API] Database connection released');
      }
    }
  });

  app.post('/api/categories', async (req, res) => {
    try {
      const categoryData = await insertCategorySchema.parseAsync({
        name: req.body.name,
        color: req.body.color,
        icon: req.body.icon,
      });

      const [newCategory] = await db.insert(categories)
        .values(categoryData)
        .returning();

      res.status(201).json(newCategory);
    } catch (error) {
      console.error('Error creating category:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: 'Invalid request data' });
      }
    }
  });

  app.patch('/api/categories/:id', async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const category = await db.query.categories.findFirst({
        where: eq(categories.id, categoryId),
      });

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const categoryData = await insertCategorySchema.partial().parseAsync({
        name: req.body.name,
        color: req.body.color,
        icon: req.body.icon === null ? undefined : req.body.icon,
      });

      const [updatedCategory] = await db.update(categories)
        .set(categoryData)
        .where(eq(categories.id, categoryId))
        .returning();

      res.json(updatedCategory);
    } catch (error) {
      console.error('Error updating category:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: 'Invalid request data' });
      }
    }
  });

  app.delete('/api/categories/:id', async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const category = await db.query.categories.findFirst({
        where: eq(categories.id, categoryId),
      });

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      await db.delete(categories)
        .where(eq(categories.id, categoryId));

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ message: 'Server error deleting category' });
    }
  });

  // Bills Routes
  app.get('/api/bills', async (req, res) => {
    try {
      console.log('[Bills API] Fetching bills with categories...');

      const billsWithCategories = await db.query.bills.findMany({
        with: {
          category: true
        },
        orderBy: (bills, { asc }) => [asc(bills.created_at)]
      });

      console.log('[Bills API] Found bills:', billsWithCategories.length);

      // Transform the data to include category information directly
      const formattedBills = billsWithCategories.map(bill => ({
        ...bill,
        category_name: bill.category?.name || 'Uncategorized',
        category_color: bill.category?.color || '#D3D3D3',
        category_icon: bill.category?.icon || null
      }));

      return res.json(formattedBills);
    } catch (error) {
      console.error('[Bills API] Error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown database error';

      return res.status(500).json({
        message: 'Failed to load bills',
        error: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });


  // Add test endpoints after existing routes but before httpServer creation
  app.get('/api/test/error/404', (_req, res) => {
    res.status(404).json({ message: 'Resource not found test' });
  });

  app.get('/api/test/error/500', (_req, res) => {
    res.status(500).json({ message: 'Server error test' });
  });

  app.get('/api/test/error/network', (_req, res) => {
    // Simulate a network timeout with a shorter delay
    setTimeout(() => {
      res.status(504).json({ message: 'Network timeout test' });
    }, 2000); // Reduced from 5000ms to 2000ms
  });

  const httpServer = createServer(app);
  return httpServer;
}