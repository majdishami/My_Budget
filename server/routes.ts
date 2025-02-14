import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { categories, users, insertUserSchema, insertCategorySchema, transactions, insertTransactionSchema } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";
import { sql } from 'drizzle-orm';
import pkg from 'pg';
const { Pool } = pkg;
import dayjs from 'dayjs';
import { bills, insertBillSchema } from "@db/schema";
import { setupAuth } from './auth';

// Import other routes
import syncRoutes from './routes/sync';

export function registerRoutes(app: Express): Server {
  console.log('[Server] Starting route registration...');

  // Set up authentication but don't enforce it yet
  setupAuth(app);

  // Register sync routes
  app.use(syncRoutes);

  // Transactions Routes - no auth required temporarily
  app.get('/api/transactions', async (req, res) => {
    try {
      console.log('[Transactions API] Fetching transactions...');
      const allTransactions = await db.select()
        .from(transactions)
        .orderBy(desc(transactions.date));

      console.log('[Transactions API] Found transactions:', allTransactions.length);
      return res.json(allTransactions);
    } catch (error) {
      console.error('[Transactions API] Error:', error);
      return res.status(500).json({
        message: 'Failed to load transactions',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Categories Routes - no auth required temporarily
  app.get('/api/categories', async (req, res) => {
    try {
      console.log('[Categories API] Fetching categories...');
      const allCategories = await db.query.categories.findMany({
        orderBy: [categories.name],
      });
      return res.json(allCategories);
    } catch (error) {
      console.error('[Categories API] Error:', error);
      return res.status(500).json({ 
        message: 'Failed to load categories',
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
    }
  });

  app.post('/api/transactions', async (req, res) => {
    try {
      const transactionData = await insertTransactionSchema.parseAsync({
        ...req.body,
        user_id: 1, // Temporary default user ID
      });

      const [newTransaction] = await db.insert(transactions)
        .values(transactionData)
        .returning();

      res.status(201).json(newTransaction);
    } catch (error) {
      console.error('Error creating transaction:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Invalid request data'
      });
    }
  });

  app.patch('/api/transactions/:id', async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);

      const transaction = await db.query.transactions.findFirst({
        where: eq(transactions.id, transactionId),
      });

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      const updateData = {
        description: req.body.description,
        amount: typeof req.body.amount === 'string' ? parseFloat(req.body.amount) : req.body.amount,
        date: req.body.date,
        type: req.body.type,
        category_id: req.body.category_id ? parseInt(req.body.category_id) : null,
        user_id: 1 // Temporary default user ID
      };

      const [updatedTransaction] = await db.update(transactions)
        .set(updateData)
        .where(eq(transactions.id, transactionId))
        .returning();

      res.json(updatedTransaction);
    } catch (error) {
      console.error('Error updating transaction:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Invalid request data'
      });
    }
  });

  app.delete('/api/transactions/:id', async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);

      const transaction = await db.query.transactions.findFirst({
        where: eq(transactions.id, transactionId),
      });

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      await db.delete(transactions)
        .where(eq(transactions.id, transactionId));

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      res.status(500).json({ message: 'Server error deleting transaction' });
    }
  });

  // Bills Routes - no auth required temporarily
  app.get('/api/bills', async (req, res) => {
    try {
      console.log('[Bills API] Fetching bills...');

      // Test database connection first
      await db.execute(sql`SELECT 1`);
      console.log('[Bills API] Database connection successful');

      const allBills = await db.query.bills.findMany({
        orderBy: [bills.day],
        with: {
          category: true
        }
      });
      console.log('[Bills API] Bills with categories count:', allBills.length);

      const formattedBills = allBills.map(bill => ({
        id: bill.id,
        name: bill.name,
        amount: Number(bill.amount),
        day: bill.day,
        category_id: bill.category_id,
        category_name: bill.category?.name || 'Uncategorized',
        category_color: bill.category?.color || '#D3D3D3',
        category_icon: bill.category?.icon || null,
      }));

      console.log('[Bills API] Formatted bills:', JSON.stringify(formattedBills, null, 2));
      return res.json(formattedBills);
    } catch (error) {
      console.error('[Bills API] Error:', error);
      return res.status(500).json({
        message: 'Failed to load bills',
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  app.post('/api/bills', async (req, res) => {
    try {
      const billData = await insertBillSchema.parseAsync({
        ...req.body,
        user_id: 1 // Temporary default user ID
      });

      const [newBill] = await db.insert(bills)
        .values(billData)
        .returning();

      res.status(201).json(newBill);
    } catch (error) {
      console.error('Error creating bill:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Invalid request data'
      });
    }
  });

  console.log('[Server] Route registration completed');
  const httpServer = createServer(app);
  return httpServer;
}