import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { categories, insertCategorySchema } from "@db/schema";
import { eq } from "drizzle-orm";
import { sql } from 'drizzle-orm';
import pkg from 'pg';
const { Pool } = pkg;

export function registerRoutes(app: Express): Server {
  // Initialize a database pool for raw queries
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : undefined
  });

  // Categories Routes with simplified implementation
  app.get('/api/categories', async (req, res) => {
    // Set CORS headers for all environments
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Content-Type', 'application/json');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    let client;
    try {
      client = await pool.connect();
      console.log('[Categories API] Database connection established');

      const result = await client.query('SELECT * FROM categories ORDER BY id');
      console.log('[Categories API] Found categories:', result.rows.length);

      return res.json(result.rows);
    } catch (error) {
      console.error('[Categories API] Error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown database error';

      return res.status(500).json({
        message: 'Failed to load categories',
        error: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    } finally {
      if (client) {
        client.release();
        console.log('[Categories API] Database connection released');
      }
    }
  });

  app.post('/api/categories', async (req, res) => {
    try {
      const categoryData = await insertCategorySchema.parseAsync({
        name: req.body.name,
        color: req.body.color,
        icon: req.body.icon,
      });

      const [newCategory] = await db.insert(categories)
        .values(categoryData)
        .returning();

      res.status(201).json(newCategory);
    } catch (error) {
      console.error('Error creating category:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: 'Invalid request data' });
      }
    }
  });

  app.patch('/api/categories/:id', async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const [category] = await db.select()
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const categoryData = await insertCategorySchema.partial().parseAsync({
        name: req.body.name,
        color: req.body.color,
        icon: req.body.icon === null ? undefined : req.body.icon,
      });

      const [updatedCategory] = await db.update(categories)
        .set(categoryData)
        .where(eq(categories.id, categoryId))
        .returning();

      res.json(updatedCategory);
    } catch (error) {
      console.error('Error updating category:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: 'Invalid request data' });
      }
    }
  });

  app.delete('/api/categories/:id', async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const [category] = await db.select()
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      await db.delete(categories)
        .where(eq(categories.id, categoryId));

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ message: 'Server error deleting category' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}