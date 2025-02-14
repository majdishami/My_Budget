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

export function registerRoutes(app: Express): Server {
  // Test route
  app.get('/api/health', (req, res) => {
    console.log('[Server] Health check endpoint called');
    res.json({ status: 'ok' });
  });

  // Categories Routes
  app.get('/api/categories', async (req, res) => {
    try {
      console.log("Fetching categories...");
      const userCategories = await db.query.categories.findMany({
        orderBy: (categories, { asc }) => [asc(categories.name)],
      });
      return res.json(userCategories || []);
    } catch (error) {
      console.error("Error in /api/categories:", error);
      return res.status(500).json({ 
        message: "Failed to load categories.",
        error: error instanceof Error ? error.message : "Unknown error"
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
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Invalid request data'
      });
    }
  });

  // Transactions Routes
  app.get('/api/transactions', async (req, res) => {
    try {
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
      const parsedDate = dayjs(req.body.date);
      if (!parsedDate.isValid()) {
        return res.status(400).json({ message: 'Invalid date format' });
      }

      const transactionData = {
        description: req.body.description,
        amount: req.body.amount,
        date: parsedDate.toDate(),
        type: req.body.type,
        category_id: req.body.category_id,
        recurring_id: req.body.recurring_id || null
      };

      const [newTransaction] = await db.insert(transactions)
        .values(transactionData)
        .returning();

      const response = {
        ...newTransaction,
        date: dayjs(newTransaction.date).format('YYYY-MM-DD'),
        amount: Number(newTransaction.amount)
      };

      res.status(201).json(response);
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
      const { description, amount, date, type, category_id, recurring_id } = req.body;

      const parsedDate = dayjs(date);
      if (!parsedDate.isValid()) {
        return res.status(400).json({ message: 'Invalid date format' });
      }

      const transaction = await db.query.transactions.findFirst({
        where: eq(transactions.id, transactionId),
      });

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      console.log('[Transactions API] Updating transaction:', {
        id: transactionId,
        originalDate: date,
        parsedDate: parsedDate.format('YYYY-MM-DD')
      });

      const [updatedTransaction] = await db.update(transactions)
        .set({
          description,
          amount,
          date: parsedDate.toDate(),
          type,
          category_id,
          recurring_id: recurring_id || null
        })
        .where(eq(transactions.id, transactionId))
        .returning();

      const response = {
        ...updatedTransaction,
        date: dayjs(updatedTransaction.date).format('YYYY-MM-DD'),
        amount: Number(updatedTransaction.amount)
      };

      console.log('[Transactions API] Updated transaction:', response);
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
        orderBy: [bills.name], //removed day field from orderby
        with: {
          category: true
        }
      });

      const formattedBills = allBills.map(bill => ({
        id: bill.id,
        name: bill.name,
        amount: Number(bill.amount),
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
        name:req.body.name,
        amount: req.body.amount,
        category_id: req.body.category_id
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