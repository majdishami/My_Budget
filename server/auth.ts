import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db, pool } from "@db";
import { eq } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcrypt";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const SALT_ROUNDS = 12;
const PostgresSessionStore = connectPg(session);

async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePasswords(supplied: string, stored: string) {
  return bcrypt.compare(supplied, stored);
}

async function getUserByUsername(username: string) {
  return db.select().from(users).where(eq(users.username, username)).limit(1);
}

export function setupAuth(app: Express) {
  console.log('[Auth] Setting up authentication...');

  const store = new PostgresSessionStore({ 
    pool,
    createTableIfMissing: true,
    tableName: 'session'
  });

  const sessionSettings: session.SessionOptions = {
    store,
    secret: process.env.REPL_ID!,
    resave: false,
    saveUninitialized: false,
    name: 'session_id', // Set a specific cookie name
    cookie: {
      secure: false, // Set to false for development
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      sameSite: 'lax'
    }
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    if (sessionSettings.cookie) {
      sessionSettings.cookie.secure = true;
    }
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  console.log('[Auth] Setting up passport strategy...');

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log('[Auth] Attempting login for user:', username);
        const [user] = await getUserByUsername(username);

        if (!user) {
          console.log('[Auth] Login failed: User not found');
          return done(null, false, { message: 'Invalid username or password' });
        }

        const isValidPassword = await comparePasswords(password, user.password);
        if (!isValidPassword) {
          console.log('[Auth] Login failed: Invalid password');
          return done(null, false, { message: 'Invalid username or password' });
        }

        console.log('[Auth] Login successful for user:', user.id);
        return done(null, user);
      } catch (error) {
        console.error('[Auth] Login error:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user: Express.User, done) => {
    console.log('[Auth] Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('[Auth] Deserializing user:', id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log('[Auth] Deserialization failed: User not found:', id);
        return done(null, false);
      }

      console.log('[Auth] Successfully deserialized user:', id);
      done(null, user);
    } catch (error) {
      console.error('[Auth] Deserialization error:', error);
      done(error);
    }
  });

  // Authentication middleware to log session info
  app.use((req, res, next) => {
    console.log('[Auth] Session Info:', {
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? { id: (req.user as Express.User).id } : null,
      cookie: req.session?.cookie
    });
    next();
  });

  // Authentication Routes
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log('[Auth] Processing registration:', req.body.username);
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ message: error.toString() });
      }

      const [existingUser] = await getUserByUsername(result.data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(result.data.password);
      const [user] = await db
        .insert(users)
        .values({
          ...result.data,
          password: hashedPassword,
        })
        .returning();

      req.login(user, (err) => {
        if (err) return next(err);
        console.log('[Auth] Registration successful. User logged in:', user.id);
        res.status(201).json({ id: user.id, username: user.username });
      });
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('[Auth] Login attempt:', req.body.username);

    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error('[Auth] Login error:', err);
        return next(err);
      }

      if (!user) {
        console.log('[Auth] Login failed:', info?.message);
        return res.status(401).json({ message: info?.message || 'Authentication failed' });
      }

      req.login(user, (err) => {
        if (err) {
          console.error('[Auth] Session creation error:', err);
          return next(err);
        }

        console.log('[Auth] Login successful. Session created:', {
          userId: user.id,
          sessionId: req.sessionID
        });

        res.json({ id: user.id, username: user.username });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    console.log('[Auth] Logging out user:', req.user ? (req.user as Express.User).id : 'No user');
    req.logout((err) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return res.status(500).json({ message: 'Error during logout' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log('[Auth] User info request:', {
      isAuthenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      user: req.user ? { id: (req.user as Express.User).id } : null
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = req.user as Express.User;
    res.json({ id: user.id, username: user.username });
  });

  console.log('[Auth] Authentication setup completed');
}