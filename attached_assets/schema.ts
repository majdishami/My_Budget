import { pgTable, text, serial, integer, boolean, timestamp, decimal, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon"),
});

export const insertCategorySchema = createInsertSchema(categories);

// Tags table
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // 'income' or 'expense'
  category_id: integer("category_id").references(() => categories.id),
  recurring_id: integer("recurring_id").references(() => recurring_transactions.id),
  created_at: timestamp("created_at").defaultNow(),
});

// Transaction tags junction table
export const transaction_tags = pgTable("transaction_tags", {
  transaction_id: integer("transaction_id").references(() => transactions.id).notNull(),
  tag_id: integer("tag_id").references(() => tags.id).notNull(),
});

// Recurring transactions table
export const recurring_transactions = pgTable("recurring_transactions", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  frequency: text("frequency").notNull(), // 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'
  start_date: date("start_date").notNull(),
  end_date: date("end_date"),
  last_generated: timestamp("last_generated"),
  category_id: integer("category_id").references(() => categories.id),
  created_at: timestamp("created_at").defaultNow(),
});