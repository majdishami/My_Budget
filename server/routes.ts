import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { categories, users, insertUserSchema, insertCategorySchema, transactions, insertTransactionSchema } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import crypto from "crypto";
import { sql } from 'drizzle-orm';
import pkg from 'pg';
const { Pool } = pkg;
import dayjs from 'dayjs';

// Hash password using SHA-256
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function registerRoutes(app: Express): Server {
  console.log('[Server] Starting route registration...');

  // Initialize PostgreSQL session store
  const PgSession = ConnectPgSimple(session);
  console.log('[Server] Initialized PgSession');

  // Test database connection
  try {
    console.log('[Server] Testing database connection...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : undefined
    });

    pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.error('[Server] Database connection test failed:', err);
        throw err;
      }
      console.log('[Server] Database connection test successful');
    });
  } catch (error) {
    console.error('[Server] Failed to create database pool:', error);
    throw error;
  }

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
  console.log('[Server] Session middleware configured');

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  console.log('[Server] Passport initialized');

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
  console.log('[Server] Passport strategy configured');

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

  // Test route
  app.get('/api/health', (req, res) => {
    console.log('[Server] Health check endpoint called');
    res.json({ status: 'ok' });
  });

  // Authentication Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      console.log('[Server] Processing registration request');
      const { username, password } = await insertUserSchema.parseAsync(req.body);

      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      const hashedPassword = hashPassword(password);
      const [newUser] = await db.insert(users).values({
        username,
        password: hashedPassword,
      }).returning();

      console.log('[Server] User registered successfully');
      res.status(201).json({ message: 'User created successfully', id: newUser.id });
    } catch (error) {
      console.error('[Server] Registration error:', error);
      res.status(400).json({ message: 'Invalid request' });
    }
  });

  app.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
    console.log('[Server] User logged in successfully');
    res.json({ message: 'Logged in successfully' });
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout(() => {
      console.log('[Server] User logged out successfully');
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Test route for auth status
  app.get('/api/auth/status', (req, res) => {
    console.log('[Server] Auth status check');
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? { id: (req.user as any).id } : null
    });
  });

  // Categories Routes with simplified implementation
  app.get('/api/categories', async (req, res) => {
    try {
      console.log('[Categories API] Fetching categories...');

      // Verify database connection
      const testQuery = await db.execute(sql`SELECT NOW()`);
      console.log('[Categories API] Database connection test successful');

      const allCategories = await db.query.categories.findMany({
        orderBy: [categories.name],
      });

      console.log('[Categories API] Found categories:', allCategories.length);
      return res.json(allCategories);
    } catch (error) {
      console.error('[Categories API] Error:', error);
      return res.status(500).json({
        message: 'Failed to load categories',
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
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

  // Transactions Routes
  app.get('/api/transactions', async (req, res) => {
    try {
      console.log('[Transactions API] Fetching transactions...');

      const allTransactions = await db.query.transactions.findMany({
        orderBy: [desc(transactions.date)],
        with: {
          category: true
        }
      });

      console.log('[Transactions API] Raw transactions:', JSON.stringify(allTransactions, null, 2));

      const formattedTransactions = allTransactions.map(transaction => {
        const transactionDate = dayjs(transaction.date).startOf('day');
        console.log('[Transactions API] Processing transaction:', {
          original: transaction,
          parsedDate: transactionDate.format(),
          dayOfMonth: transactionDate.date(),
          month: transactionDate.month(),
          year: transactionDate.year()
        });

        const formatted = {
          id: transaction.id,
          description: transaction.description,
          amount: Number(transaction.amount),
          date: transactionDate.toISOString(),
          type: transaction.type,
          category_id: transaction.category_id,
          category_name: transaction.category?.name || 'Uncategorized',
          category_color: transaction.category?.color || '#D3D3D3',
          category_icon: transaction.category?.icon || null,
        };
        console.log('[Transactions API] Formatted transaction:', formatted);
        return formatted;
      });

      console.log('[Transactions API] All formatted transactions:', formattedTransactions);
      return res.json(formattedTransactions);
    } catch (error) {
      console.error('[Transactions API] Error:', error);
      return res.status(500).json({
        message: 'Failed to load transactions',
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error',
      });
    }
  });

  app.post('/api/transactions', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const transactionData = await insertTransactionSchema.parseAsync({
        ...req.body,
        user_id: userId,
      });

      const [newTransaction] = await db.insert(transactions)
        .values(transactionData)
        .returning();

      res.status(201).json(newTransaction);
    } catch (error) {
      console.error('Error creating transaction:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Invalid request data'
      });
    }
  });

  app.patch('/api/transactions/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const transactionId = parseInt(req.params.id);

      const transaction = await db.query.transactions.findFirst({
        where: and(
          eq(transactions.id, transactionId),
          eq(transactions.user_id, userId)
        ),
      });

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      const [updatedTransaction] = await db.update(transactions)
        .set(req.body)
        .where(and(
          eq(transactions.id, transactionId),
          eq(transactions.user_id, userId)
        ))
        .returning();

      res.json(updatedTransaction);
    } catch (error) {
      console.error('Error updating transaction:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Invalid request data'
      });
    }
  });

  app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const transactionId = parseInt(req.params.id);

      const transaction = await db.query.transactions.findFirst({
        where: and(
          eq(transactions.id, transactionId),
          eq(transactions.user_id, userId)
        ),
      });

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      await db.delete(transactions)
        .where(and(
          eq(transactions.id, transactionId),
          eq(transactions.user_id, userId)
        ));

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      res.status(500).json({ message: 'Server error deleting transaction' });
    }
  });

  console.log('[Server] Route registration completed');
  const httpServer = createServer(app);
  return httpServer;
}