import { pgTable, serial, text, integer, timestamp, decimal, boolean, varchar, numeric } from "drizzle-orm/pg-core";
import { z } from "zod";
import { drizzle } from "drizzle-orm/postgres-js";
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'yourUsername',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'yourDatabase',
  password: process.env.DB_PASSWORD || 'yourPassword',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Categories table
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 50 }).default('#6366F1'),
  icon: varchar('icon', { length: 50 }).default('dollar-sign'),
  user_id: integer('user_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Transactions table
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  description: varchar('description', { length: 255 }).notNull(),
  amount: numeric('amount').notNull(),
  date: timestamp('date').notNull(),
  category_id: integer('category_id').references(() => categories.id),
  user_id: integer('user_id').references(() => users.id),
  type: varchar('type', { length: 20 }).notNull(), // 'income' or 'expense'
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Bills table
export const bills = pgTable('bills', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  amount: numeric('amount').notNull(),
  day: integer('day').notNull(),
  category_id: integer('category_id').references(() => categories.id),
  user_id: integer('user_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  email: z.string().email().optional(),
});

export const insertCategorySchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().min(4).max(50).optional(),
  icon: z.string().max(50).optional(),
  user_id: z.number().optional(),
});

export const insertTransactionSchema = z.object({
  description: z.string().min(1).max(255),
  amount: z.number().positive(),
  date: z.string().or(z.date()),
  category_id: z.number().optional(),
  user_id: z.number().optional(),
  type: z.enum(['income', 'expense']),
});

export const insertBillSchema = z.object({
  name: z.string().min(1).max(255),
  amount: z.number().positive(),
  day: z.number().min(1).max(31),
  category_id: z.number().optional(),
  user_id: z.number().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  color: z.string().min(1, "Color is required"),
  icon: z.string().nullish(),
});


export type SelectUser = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SelectCategory = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;
export type SelectTransaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type SelectBill = typeof bills.$inferSelect;
export type InsertBill = typeof bills.$inferInsert;

// Drizzle ORM instance
export const db = drizzle(pool, {
  schema: {
    users,
    categories,
    transactions,
    bills,
  },
});