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

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon"),
  user_id: integer("user_id").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
});

// Define relationships
export const userRelations = relations(users, ({ many }) => ({
  categories: many(categories),
}));

export const categoryRelations = relations(categories, ({ one }) => ({
  user: one(users, {
    fields: [categories.user_id],
    references: [users.id],
  }),
}));

// Create Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertCategorySchema = createInsertSchema(categories);

// Export types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;