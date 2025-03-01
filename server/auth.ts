import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import connectPg from "connect-pg-simple";
import { promisify } from "util";
import { insertUserSchema, users } from "@db/schema";
import { pool } from "@db";
import { eq } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcrypt";
import { SelectUser } from "@db/schema";
import { db } from "@db";
import session from "express-session";
import { SessionOptions } from "express-session";

declare global {
  namespace Express {
    interface User extends SelectUser {
      username: string;
      id: number;
    }
    interface Request {
      isAuthenticated(): boolean;
      user?: SelectUser;
      login(user: Express.User, done: (err: any) => void): void;
      logout(done: (err: any) => void): void;
    }
  }
}

const SALT_ROUNDS = 12;
const PostgresSessionStore = connectPg(session);

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return bcrypt.compare(supplied, stored);
}

async function getUserByUsername(username: string): Promise<SelectUser[]> {
  return db.select().from(users).where(eq(users.username, username)).limit(1).execute();
}

export function setupAuth(app: Express): void {
  console.log('[Auth] Setting up minimal auth configuration...');

  // Add a basic endpoint for checking auth status that doesn't require session
  app.get("/api/user", (req, res) => {
    // Since no auth is needed, always return a default user
    res.json({ id: 1, username: "default" });
  });

  // Add a logout endpoint
  app.get("/api/logout", (req, res) => {
    res.json({ success: true, message: "Logged out successfully" });
  });

  console.log('[Auth] Minimal auth configuration completed');
}