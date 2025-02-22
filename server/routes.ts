import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users, insertUserSchema, categories, insertCategorySchema, transactions, bills, insertTransactionSchema } from "@db/schema";
import { eq, desc, ilike, or, and } from "drizzle-orm";
import { sql } from 'drizzle-orm';
import dayjs from 'dayjs';
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import crypto from "crypto";

export function registerRoutes(app: Express): Server {
  // Test route
  app.get('/api/health', (req, res) => {
    console.log('[Server] Health check endpoint called');
    res.json({ status: 'ok' });
  });

  // Categories Routes
  app.get('/api/categories', async (req, res) => {
    try {
      console.log('[Categories API] Fetching categories...');
      const allCategories = await db.query.categories.findMany({
        orderBy: [categories.name],
      });
      console.log('[Categories API] Found categories:', allCategories.length);
      return res.json(allCategories);
    } catch (error) {
      console.error('[Categories API] Error:', error);
      return res.status(500).json({
        message: 'Failed to load categories',
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  });

  // Add category creation endpoint
  app.post('/api/categories', async (req, res) => {
    try {
      console.log('[Categories API] Creating new category:', req.body);

      // Validate request body against schema
      const categoryData = await insertCategorySchema.parseAsync(req.body);

      // Insert new category
      const [newCategory] = await db.insert(categories)
        .values(categoryData)
        .returning();

      console.log('[Categories API] Created category:', newCategory);
      res.status(201).json(newCategory);
    } catch (error) {
      console.error('[Categories API] Error creating category:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Invalid request data'
      });
    }
  });

  // Update category endpoint
  app.patch('/api/categories/:id', async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      console.log('[Categories API] Updating category:', {
        id: categoryId,
        data: req.body
      });

      const existingCategory = await db.query.categories.findFirst({
        where: eq(categories.id, categoryId)
      });

      if (!existingCategory) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const [updatedCategory] = await db.update(categories)
        .set(req.body)
        .where(eq(categories.id, categoryId))
        .returning();

      console.log('[Categories API] Updated category:', updatedCategory);
      res.json(updatedCategory);
    } catch (error) {
      console.error('[Categories API] Error updating category:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Invalid request data'
      });
    }
  });

  // Add category deletion endpoint
  app.delete('/api/categories/:id', async (req, res) => {
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      console.error('[Categories API] Invalid category ID:', req.params.id);
      return res.status(400).json({
        message: "Invalid category ID",
        error: "Category ID must be a number"
      });
    }

    try {
      console.log('[Categories API] Attempting to delete category:', {
        id: categoryId
      });

      const category = await db.query.categories.findFirst({
        where: eq(categories.id, categoryId)
      });

      if (!category) {
        console.log('[Categories API] Category not found:', {
          id: categoryId
        });
        return res.status(404).json({
          message: "Category not found",
          error: `No category found with ID ${categoryId}`
        });
      }

      // Delete the category and all related records in a transaction
      try {
        await db.transaction(async (tx) => {
          //