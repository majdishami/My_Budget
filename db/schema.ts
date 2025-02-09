import { pgTable, text, serial, integer, boolean, timestamp, decimal, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Session table for connect-pg-simple
export const sessions = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon"),
  user_id: integer("user_id").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
});

// Tags table
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Financial goals table
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  target_amount: decimal("target_amount", { precision: 10, scale: 2 }).notNull(),
  current_amount: decimal("current_amount", { precision: 10, scale: 2 }).default("0"),
  start_date: date("start_date").notNull(),
  target_date: date("target_date").notNull(),
  category_id: integer("category_id").references(() => categories.id),
  user_id: integer("user_id").references(() => users.id).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Transactions table (replaces old income/expense tracking)
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // 'income' or 'expense'
  category_id: integer("category_id").references(() => categories.id),
  user_id: integer("user_id").references(() => users.id).notNull(),
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
  user_id: integer("user_id").references(() => users.id).notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Report settings table
export const report_settings = pgTable("report_settings", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'monthly', 'category', 'goal', 'custom'
  config: jsonb("config").notNull(), // Flexible configuration storage
  created_at: timestamp("created_at").defaultNow(),
});

// Define relationships
export const userRelations = relations(users, ({ many }) => ({
  categories: many(categories),
  tags: many(tags),
  goals: many(goals),
  transactions: many(transactions),
  recurring_transactions: many(recurring_transactions),
  report_settings: many(report_settings),
}));

export const categoryRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.user_id],
    references: [users.id],
  }),
  transactions: many(transactions),
  goals: many(goals),
  recurring_transactions: many(recurring_transactions),
}));

export const transactionRelations = relations(transactions, ({ one, many }) => ({
  user: one(users, {
    fields: [transactions.user_id],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [transactions.category_id],
    references: [categories.id],
  }),
  recurring_transaction: one(recurring_transactions, {
    fields: [transactions.recurring_id],
    references: [recurring_transactions.id],
  }),
  tags: many(transaction_tags),
}));

// Create Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertCategorySchema = createInsertSchema(categories);
export const insertTransactionSchema = createInsertSchema(transactions);
export const insertGoalSchema = createInsertSchema(goals);
export const insertRecurringSchema = createInsertSchema(recurring_transactions);

// Export types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type RecurringTransaction = typeof recurring_transactions.$inferSelect;
export type Tag = typeof tags.$inferSelect;