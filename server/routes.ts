import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users, insertUserSchema, categories, insertCategorySchema } from "@db/schema";
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

  // Test route for auth status
  app.get('/api/auth/status', (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? { id: (req.user as any).id } : null
    });
  });

  // Category Routes
  app.get('/api/categories', async (req, res) => {
    try {
      // Check if database is accessible
      console.log('Attempting to fetch categories from database...');
      const dbCheck = await db.query.categories.findFirst();
      console.log('Initial DB check result:', dbCheck);

      if (!dbCheck) {
        console.log('No categories found in initial check, returning empty array');
        return res.json([]);
      }

      console.log('Fetching all categories...');
      const userCategories = await db.query.categories.findMany({
        orderBy: (categories, { asc }) => [asc(categories.name)],
      });
      console.log('Found categories:', userCategories);

      if (!userCategories) {
        console.log('No categories found in full query, returning empty array');
        return res.json([]);
      }

      console.log('Successfully returning categories:', userCategories.length);
      res.json(userCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ 
        message: 'Error fetching categories',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        .set({
          ...categoryData,
          name: categoryData.name.trim(),
          color: categoryData.color.trim(),
          icon: categoryData.icon?.trim()
        })
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

  const httpServer = createServer(app);
  return httpServer;
}