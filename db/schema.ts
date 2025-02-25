import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";
import { InferModel } from "drizzle-orm";

// Categories table - Lookup table for transaction and bill categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon"),
  created_at: timestamp("created_at").defaultNow(),
});

// Transactions table with proper foreign keys and default date
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // 'income' or 'expense'
  category_id: integer("category_id").references(() => categories.id),
  created_at: timestamp("created_at").defaultNow(),
  recurring_type: text("recurring_type"),
  is_recurring: boolean("is_recurring").default(false),
  first_date: integer("first_date"),
  second_date: integer("second_date"),
});

// Bills table with all required fields
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

// Create Zod schemas for validation
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

// Schema for category updates
export const updateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  color: z.string().min(1, "Color is required"),
  icon: z.string().nullish(),
});

// Export types
export type Category = InferModel<typeof categories, 'select'>;
export type Bill = InferModel<typeof bills, 'select'>;
export type Transaction = InferModel<typeof transactions, 'select'>;

// Fix: Change the type of db to NodePgClient
const db = drizzle(httpServer, {
  schema,
});

// Fix: Create Vite server with proper configuration
const viteServer = createViteServer({
  appType: "./src/main",
  server: {
    middleware: [
      sessionMiddleware({
        store: new MemoryStore(),
        secret: "keyboard cat",
        resave: false,
        saveUninitialized: true,
        cookie: {
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 1000, // 1 hour
        },
      }),
    ],
  },
});

import http from 'http';
import { createServer as createViteServer } from 'vite';
import type { SessionOptions } from 'express-session';
import viteConfig from './vite.config';
import schema from "./schema";

import type { Category, Bill, Transaction } from "./schema";

// Additional necessary code
export const additionalCodeFunction = () => {
  console.log("Additional code that might be necessary for the application.");
};