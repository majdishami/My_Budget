import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { categories, users, insertUserSchema, insertCategorySchema, transactions, insertTransactionSchema } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { sql } from 'drizzle-orm';
import pkg from 'pg';
const { Pool } = pkg;
import dayjs from 'dayjs';
import { bills, insertBillSchema } from "@db/schema";

// Hash password using SHA-256
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function registerRoutes(app: Express): Server {
  // Test route
  app.get('/api/health', (req, res) => {
    console.log('[Server] Health check endpoint called');
    res.json({ status: 'ok' });
  });

  // Categories Routes with simplified implementation
  app.get('/api/categories', async (req, res) => {
    try {
      const allCategories = await db.query.categories.findMany({
        orderBy: [categories.name],
      });
      return res.json(allCategories);
    } catch (error) {
      console.error('[Categories API] Error:', error);
      return res.status(500).json({
        message: 'Failed to load categories',
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
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

  // Transactions Routes
  app.get('/api/transactions', async (req, res) => {
    try {
      console.log('[Transactions API] Fetching transactions...');

      const query = db.select({
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

      const allTransactions = await query;

      const formattedTransactions = allTransactions.map(transaction => ({
        id: transaction.id,
        description: transaction.description,
        amount: Number(transaction.amount),
        date: dayjs(transaction.date).format('YYYY-MM-DD'),
        type: transaction.type,
        category_id: transaction.category_id,
        category_name: transaction.category?.name || 'Uncategorized',
        category_color: transaction.category?.color || '#D3D3D3',
        category_icon: transaction.category?.icon || null,
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
      const transactionData = await insertTransactionSchema.parseAsync({
        ...req.body,
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
      const { description, amount, date, type, category_id, day, recurring_id } = req.body;

      // Validate and convert date
      const parsedDate = dayjs(date);
      if (!parsedDate.isValid()) {
        return res.status(400).json({ message: 'Invalid date format' });
      }

      // Get the transaction to update
      const transaction = await db.query.transactions.findFirst({
        where: eq(transactions.id, transactionId),
      });

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      // Convert date string to Date object for database
      const dateObject = parsedDate.toDate();

      const [updatedTransaction] = await db.update(transactions)
        .set({
          description,
          amount,
          date: dateObject,
          type,
          category_id,
          day: day || null,
          recurring_id: recurring_id || null
        })
        .where(eq(transactions.id, transactionId))
        .returning();

      // Format the response
      const response = {
        ...updatedTransaction,
        date: dayjs(updatedTransaction.date).format('YYYY-MM-DD'),
        amount: Number(updatedTransaction.amount)
      };

      res.json(response);
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

  // Bills Routes
  app.get('/api/bills', async (req, res) => {
    try {
      const allBills = await db.query.bills.findMany({
        orderBy: [bills.day],
        with: {
          category: true
        }
      });

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

      return res.json(formattedBills);
    } catch (error) {
      console.error('[Bills API] Error:', error);
      return res.status(500).json({
        message: 'Failed to load bills',
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  });

  app.post('/api/bills', async (req, res) => {
    try {
      const billData = await insertBillSchema.parseAsync({
        ...req.body,
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