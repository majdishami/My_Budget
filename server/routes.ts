import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { categories, transactions, insertTransactionSchema } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { sql } from 'drizzle-orm';
import pkg from 'pg';
const { Pool } = pkg;
import dayjs from 'dayjs';

export function registerRoutes(app: Express): Server {
  console.log('[Server] Starting route registration...');

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

  // Transactions Routes
  app.get('/api/transactions', async (req, res) => {
    try {
      console.log('[Transactions API] Fetching transactions...');
      const type = req.query.type as string | undefined;

      let query = db.select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        date: transactions.date,
        type: transactions.type,
        category_id: transactions.category_id,
        category: categories
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.category_id, categories.id))
      .orderBy(desc(transactions.date));

      if (type) {
        query = query.where(eq(transactions.type, type));
      }

      const allTransactions = await query;
      console.log('[Transactions API] Found transactions:', allTransactions.length);

      const formattedTransactions = allTransactions.map(transaction => ({
        id: transaction.id,
        description: transaction.description,
        amount: Number(transaction.amount),
        date: dayjs(transaction.date).format('YYYY-MM-DD'),
        type: transaction.type,
        category_id: transaction.category_id,
        category_name: transaction.category?.name || 'Uncategorized',
        category_color: transaction.category?.color || '#D3D3D3',
        category_icon: transaction.category?.icon || null
      }));

      return res.json(formattedTransactions);
    } catch (error) {
      console.error('[Transactions API] Error:', error);
      return res.status(500).json({
        message: 'Failed to load transactions',
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  });

  app.post('/api/transactions', async (req, res) => {
    try {
      console.log('[Transactions API] Creating new transaction:', req.body);
      const transactionData = await insertTransactionSchema.parseAsync(req.body);

      const [newTransaction] = await db.insert(transactions)
        .values(transactionData)
        .returning();

      console.log('[Transactions API] Created transaction:', newTransaction);
      res.status(201).json(newTransaction);
    } catch (error) {
      console.error('[Transactions API] Error creating transaction:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Invalid request data'
      });
    }
  });

  app.patch('/api/transactions/:id', async (req, res) => {
    try {
      console.log('[Transactions API] Updating transaction:', {
        id: req.params.id,
        data: req.body
      });

      const transactionId = parseInt(req.params.id);
      const existingTransaction = await db.query.transactions.findFirst({
        where: eq(transactions.id, transactionId)
      });

      if (!existingTransaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      // Convert the date string to a proper Date object
      const date = new Date(req.body.date);
      console.log('[Transactions API] Processing date:', date);

      const [updatedTransaction] = await db.update(transactions)
        .set({
          description: req.body.description,
          amount: req.body.amount,
          date: date,
          type: req.body.type,
          category_id: req.body.category_id
        })
        .where(eq(transactions.id, transactionId))
        .returning();

      console.log('[Transactions API] Successfully updated transaction:', updatedTransaction);
      res.json(updatedTransaction);
    } catch (error) {
      console.error('[Transactions API] Error updating transaction:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Invalid request data'
      });
    }
  });

  app.delete('/api/transactions/:id', async (req, res) => {
    try {
      console.log('[Transactions API] Deleting transaction:', req.params.id);
      const transactionId = parseInt(req.params.id);

      const transaction = await db.query.transactions.findFirst({
        where: eq(transactions.id, transactionId)
      });

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      await db.delete(transactions)
        .where(eq(transactions.id, transactionId));

      console.log('[Transactions API] Successfully deleted transaction:', req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('[Transactions API] Error deleting transaction:', error);
      res.status(500).json({ message: 'Server error deleting transaction' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}