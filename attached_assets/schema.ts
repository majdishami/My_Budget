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

export const insertUserSchema = createInsertSchema(users);



// Session table for connect-pg-simple
export const sessions = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // ✅ Add missing comma!
  color: text("color").notNull(),
  icon: text("icon"),
});




// Now categories is defined, and we can create the schema
export const insertCategorySchema = createInsertSchema(categories);

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
