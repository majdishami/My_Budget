import { pgTable, text, serial, integer, boolean, timestamp, decimal, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

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
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon"),
});

export const insertCategorySchema = createInsertSchema(categories);


// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // 'income' or 'expense'
  category_id: integer("category_id").references(() => categories.id), // Nullable for legacy data support
  user_id: integer("user_id").references(() => users.id).notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Enhanced insert schema with category validation and amount transformation
export const insertTransactionSchema = createInsertSchema(transactions, {
  type: z.enum(['income', 'expense']),
  category_id: z.number().nullable().optional(),
  description: z.string().min(1, "Description is required"),
  amount: z.union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num)) throw new Error('Invalid amount');
      return num;
    })
    .refine((val) => val > 0, "Amount must be positive"),
  date: z.date()
});

// Bills table
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  day: integer("day").notNull(),
  category_id: integer("category_id").references(() => categories.id), // Nullable for legacy data support
  created_at: timestamp("created_at").defaultNow(),
});

// Enhanced insert schema with category validation and amount transformation
export const insertBillSchema = createInsertSchema(bills, {
  name: z.string().min(1, "Name is required"),
  amount: z.union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num)) throw new Error('Invalid amount');
      return num;
    })
    .refine((val) => val > 0, "Amount must be positive"),
  day: z.number().min(1).max(31),
  category_id: z.number().nullable().optional()
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

// Transaction tags junction table
export const transaction_tags = pgTable("transaction_tags", {
  transaction_id: integer("transaction_id").references(() => transactions.id).notNull(),
  tag_id: integer("tag_id").references(() => tags.id).notNull(),
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

// Define table relationships
export const transactionsRelations = relations(transactions, ({ one }) => ({
  category: one(categories, {
    fields: [transactions.category_id],
    references: [categories.id],
  }),
  user: one(users, {
    fields: [transactions.user_id],
    references: [users.id],
  }),
}));

export const billsRelations = relations(bills, ({ one }) => ({
  category: one(categories, {
    fields: [bills.category_id],
    references: [categories.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  goals: many(goals),
  bills: many(bills),
}));