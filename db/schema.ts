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

// Schema for category updates
export const updateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  color: z.string().min(1, "Color is required"),
  icon: z.string().nullish(),
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
  second_date: integer("second_date")
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
  reminder_days: integer("reminder_days").default(7).notNull()
});

// Define relationships
export const categoryRelations = relations(categories, ({ many }) => ({
  bills: many(bills),
  transactions: many(transactions),
}));

export const billRelations = relations(bills, ({ one }) => ({
  category: one(categories, {
    fields: [bills.category_id],
    references: [categories.id],
  }),
}));

export const transactionRelations = relations(transactions, ({ one }) => ({
  category: one(categories, {
    fields: [transactions.category_id],
    references: [categories.id],
  }),
}));

// Update the insert schemas to handle default dates
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
  second_date: z.number().optional()
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

// Export types
export type Category = typeof categories.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;