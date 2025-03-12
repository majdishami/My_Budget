import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Categories table - Lookup table for transaction and bill categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon"),
  created_at: timestamp("created_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  color: z.string().min(1, "Color is required"),
  icon: z.string().nullish(),
});

export const updateCategorySchema = insertCategorySchema;

// Transactions table with proper foreign keys and default date
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  type: text("type").notNull(), // 'income' or 'expense'
  category_id: integer("category_id").references(() => categories.id),
  created_at: timestamp("created_at").defaultNow(),
  recurring_type: text("recurring_type"),
  is_recurring: boolean("is_recurring").default(false),
  first_date: integer("first_date"),
  second_date: integer("second_date")
});

// Fixing potential missing default timestamps for bills
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  day: integer("day").notNull(),
  category_id: integer("category_id").references(() => categories.id),
  created_at: timestamp("created_at").defaultNow(),
  is_one_time: boolean("is_one_time").default(false).notNull(),
  is_yearly: boolean("is_yearly").default(false).notNull(),
  date: timestamp("date").defaultNow(),
  yearly_date: timestamp("yearly_date"),
  reminder_enabled: boolean("reminder_enabled").default(false).notNull(),
  reminder_days: integer("reminder_days").default(7).notNull()
});
