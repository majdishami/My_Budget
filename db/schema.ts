import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";
import { drizzle } from "drizzle-orm/postgres-js";
import { Pool } from 'pg';
import { createServer as createViteServer } from 'vite';
import session from "express-session";
const MemoryStore = session.MemoryStore;

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'yourUsername',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'yourDatabase',
  password: process.env.DB_PASSWORD || 'yourPassword',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

// Schema definitions
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon"),
  created_at: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(),
  category_id: integer("category_id").references(() => categories.id),
  created_at: timestamp("created_at").defaultNow(),
  recurring_type: text("recurring_type"),
  is_recurring: boolean("is_recurring").default(false),
  first_date: integer("first_date"),
  second_date: integer("second_date"),
});

export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  day: integer("day").notNull(),
  category_id: integer("category_id").references(() => categories.id),
  created_at: timestamp("created_at").defaultNow(),
  is_one_time: boolean("is_one_time").default(false).notNull(),
  is_yearly: boolean("is_yearly").default(false).notNull(),
  date: timestamp("date"),
  yearly_date: timestamp("yearly_date"),
  reminder_enabled: boolean("reminder_enabled").default(false).notNull(),
  reminder_days: integer("reminder_days").default(7).notNull(),
});

// Zod schemas
export const insertCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  color: z.string().min(1, "Color is required"),
  icon: z.string().nullish(),
});

export const insertTransactionSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.number(),
  date: z.string()
    .transform((str) => str ? new Date(str) : new Date()),
  type: z.enum(["income", "expense"]),
  category_id: z.number().min(1, "Category ID is required").nullable().optional(),
  recurring_type: z.enum(["once", "monthly", "twice-monthly", "biweekly", "weekly"]).optional(),
  is_recurring: z.boolean().optional(),
  first_date: z.number().optional(),
  second_date: z.number().optional(),
});

export const insertBillSchema = z.object({
  name: z.string().min(1, "Bill name is required"),
  amount: z.number().min(0, "Amount must be non-negative"),
  day: z.number().min(1).max(31),
  category_id: z.number().min(1, "Category ID is required").nullable().optional(),
  is_one_time: z.boolean().optional(),
  is_yearly: z.boolean().optional(),
  date: z.string()
    .transform((str) => str ? new Date(str) : new Date())
    .optional(),
  yearly_date: z.string()
    .transform((str) => str ? new Date(str) : new Date())
    .optional(),
  reminder_enabled: z.boolean().optional(),
  reminder_days: z.number().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  color: z.string().min(1, "Color is required"),
  icon: z.string().nullish(),
});

// TypeScript types
export type Category = {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  created_at: Date;
};

export type Transaction = {
  id: number;
  description: string;
  amount: number;
  date: Date;
  type: string;
  category_id: number | null;
  created_at: Date;
  recurring_type: string | null;
  is_recurring: boolean;
  first_date: number | null;
  second_date: number | null;
};

export type Bill = {
  id: number;
  name: string;
  amount: number;
  day: number;
  category_id: number | null;
  created_at: Date;
  is_one_time: boolean;
  is_yearly: boolean;
  date: Date | null;
  yearly_date: Date | null;
  reminder_enabled: boolean;
  reminder_days: number;
};

// Drizzle ORM instance
export const db = drizzle(pool, {
  schema: {
    categories,
    transactions,
    bills,
  },
});

// Vite server setup
const viteServer = createViteServer({
  appType: "custom", // Use "custom" for backend applications
  server: {
    middlewareMode: true,
  },
});

// Session middleware
const sessionMiddleware = session({
  store: new MemoryStore(),
  secret: process.env.SESSION_SECRET || "keyboard cat",
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 1000, // 1 hour
  },
});

// Additional code
export const additionalCodeFunction = () => {
  console.log("Additional code that might be necessary for the application.");
};