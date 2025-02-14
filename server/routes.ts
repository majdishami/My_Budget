import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { categories, insertCategorySchema, transactions, insertTransactionSchema } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import dayjs from 'dayjs';

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

      console.log("Database Output:", JSON.stringify(userCategories, null, 2));

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
      const category = await db.query.categories.findFirst({
        where: eq(categories.id, categoryId),
      });

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
      const category = await db.query.categories.findFirst({
        where: eq(categories.id, categoryId),
      });

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

  // Transactions Routes
  app.get('/api/transactions', async (req, res) => {
    try {
      console.log('[Transactions API] Fetching transactions...');

      const allTransactions = await db.select({
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

      const transactionData = await insertTransactionSchema.parseAsync({
        ...req.body,
        date: parsedDate.toDate()
      });

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

      // Validate and convert date
      const parsedDate = dayjs(req.body.date);
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
          description: req.body.description,
          amount: req.body.amount,
          date: dateObject,
          type: req.body.type,
          category_id: req.body.category_id
        })
        .where(eq(transactions.id, transactionId))
        .returning();

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

  console.log('[Server] Route registration completed');
  const httpServer = createServer(app);
  return httpServer;
}