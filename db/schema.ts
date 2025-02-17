import { pgTable, text, serial, integer, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Categories table - Lookup table for transaction and bill categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon"),
  created_at: timestamp("created_at").defaultNow(),
});

// Transactions table with proper foreign keys
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // 'income' or 'expense'
  category_id: integer("category_id").references(() => categories.id),
  created_at: timestamp("created_at").defaultNow(),
});

// Bills table with proper foreign keys
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  day: integer("day").notNull(),
  category_id: integer("category_id").references(() => categories.id),
  created_at: timestamp("created_at").defaultNow(),
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

// Create Zod schemas for validation
export const insertCategorySchema = createInsertSchema(categories);
export const insertBillSchema = createInsertSchema(bills);
export const insertTransactionSchema = createInsertSchema(transactions);

// Export types
export type Category = typeof categories.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;