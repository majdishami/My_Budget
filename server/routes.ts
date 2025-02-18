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
      console.log('[Categories API] Attempting to delete category:', { id: categoryId });

      const category = await db.query.categories.findFirst({
        where: eq(categories.id, categoryId)
      });

      if (!category) {
        console.log('[Categories API] Category not found:', { id: categoryId });
        return res.status(404).json({
          message: "Category not found",
          error: `No category found with ID ${categoryId}`
        });
      }

      // Delete the category and all related records in a transaction
      try {
        await db.transaction(async (tx) => {
          // Delete associated transactions
          await tx.delete(transactions)
            .where(eq(transactions.category_id, categoryId));

          // Delete associated bills
          await tx.delete(bills)
            .where(eq(bills.category_id, categoryId));

          // Delete the category itself
          const result = await tx.delete(categories)
            .where(eq(categories.id, categoryId))
            .returning();

          if (!result.length) {
            throw new Error("Failed to delete category");
          }
        });

        console.log('[Categories API] Successfully deleted category:', {
          id: categoryId,
          relatedRecordsDeleted: true
        });

        return res.status(200).json({
          message: "Category deleted successfully",
          deletedId: categoryId
        });

      } catch (txError) {
        console.error('[Categories API] Transaction failed:', {
          id: categoryId,
          error: txError instanceof Error ? txError.message : 'Unknown transaction error'
        });
        throw txError; // Re-throw to be caught by outer try-catch
      }

    } catch (error) {
      console.error('[Categories API] Error in delete category handler:', {
        id: categoryId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return res.status(500).json({
        message: 'Failed to delete category',
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'Internal server error'
      });
    }
  });


  // Bills Routes with proper icon handling and cache prevention
  app.get('/api/bills', async (req, res) => {
    try {
      console.log('[Bills API] Fetching bills with categories...');

      const allBills = await db.select({
        id: bills.id,
        name: bills.name,
        amount: bills.amount,
        day: bills.day,
        category_id: bills.category_id,
        category_name: sql<string>`COALESCE(${categories.name}, 'General Expenses')`,
        category_color: sql<string>`COALESCE(${categories.color}, '#6366F1')`,
        category_icon: sql<string>`COALESCE(${categories.icon}, 'shopping-cart')`
      })
        .from(bills)
        .leftJoin(categories, eq(bills.category_id, categories.id))
        .orderBy(desc(bills.amount));

      const formattedBills = allBills.map(bill => {
        const formatted = {
          id: bill.id,
          name: bill.name,
          amount: Number(bill.amount),
          day: bill.day,
          category_id: bill.category_id,
          category_name: bill.category_name,
          category_color: bill.category_color,
          category_icon: bill.category_icon
        };
        console.log('[Bills API] Formatted bill:', formatted);
        return formatted;
      });

      console.log('[Bills API] Found bills:', formattedBills.length);

      // Add cache control headers to prevent stale data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      return res.json(formattedBills);
    } catch (error) {
      console.error('[Bills API] Error:', error);
      return res.status(500).json({
        message: 'Failed to load bills',
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  });

  // Transactions Routes with improved category matching and date range filtering
  app.get('/api/transactions', async (req, res) => {
    try {
      const type = req.query.type as 'income' | 'expense' | undefined;
      const startDate = req.query.startDate ? dayjs(req.query.startDate as string).startOf('day').toISOString() : undefined;
      const endDate = req.query.endDate ? dayjs(req.query.endDate as string).endOf('day').toISOString() : undefined;

      console.log('[Transactions API] Fetching transactions with filters:', {
        type,
        startDate,
        endDate,
        rawStartDate: req.query.startDate,
        rawEndDate: req.query.endDate
      });

      if (type && !['income', 'expense'].includes(type)) {
        return res.status(400).json({
          message: 'Invalid transaction type. Must be either "income" or "expense".'
        });
      }

      // Build base query for actual transactions
      const query = db
        .select({
          id: transactions.id,
          description: transactions.description,
          amount: transactions.amount,
          date: transactions.date,
          type: transactions.type,
          category_id: transactions.category_id,
          category_name: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
          category_color: sql<string>`COALESCE(${categories.color}, '#6366F1')`,
          category_icon: sql<string>`COALESCE(${categories.icon}, 'receipt')`
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.category_id, categories.id));

      // Build where conditions array for dynamic filtering
      const whereConditions = [];

      if (type) {
        whereConditions.push(eq(transactions.type, type));
      }

      if (startDate) {
        whereConditions.push(sql`${transactions.date} >= ${startDate}::timestamp`);
      }
      if (endDate) {
        whereConditions.push(sql`${transactions.date} <= ${endDate}::timestamp`);
      }

      if (whereConditions.length > 0) {
        query.where(and(...whereConditions));
      }

      const actualTransactions = await query;

      console.log('[Transactions API] Actual transactions found:', {
        count: actualTransactions.length,
        dateRange: { startDate, endDate },
        sampleDates: actualTransactions.slice(0, 3).map(t => dayjs(t.date).format('YYYY-MM-DD HH:mm:ss'))
      });

      // Only generate virtual transactions if we have a date range
      let virtualTransactions: any[] = [];
      if (startDate && endDate && (!type || type === 'expense')) {
        const startDateDayjs = dayjs(startDate);
        const endDateDayjs = dayjs(endDate);

        // Get all bills
        const allBills = await db
          .select()
          .from(bills)
          .leftJoin(categories, eq(bills.category_id, categories.id));

        console.log('[Transactions API] Processing bills for virtual transactions:', {
          billsCount: allBills.length,
          dateRange: {
            start: startDateDayjs.format('YYYY-MM-DD'),
            end: endDateDayjs.format('YYYY-MM-DD')
          }
        });

        // Process each bill
        for (const bill of allBills) {
          // For one-time bills
          if (bill.is_one_time && bill.date) {
            const billDate = dayjs(bill.date);
            if (billDate.isBetween(startDateDayjs, endDateDayjs, 'day', '[]')) {
              virtualTransactions.push({
                description: bill.name,
                amount: Number(bill.amount),
                date: billDate.toISOString(),
                type: 'expense',
                category_id: bill.category_id,
                category_name: bill.categories?.name || 'Uncategorized',
                category_color: bill.categories?.color || '#6366F1',
                category_icon: bill.categories?.icon || 'receipt',
                is_virtual: true
              });
            }
            continue;
          }

          // For yearly bills
          if (bill.is_yearly && bill.yearly_date) {
            const yearlyDate = dayjs(bill.yearly_date);
            // Check for each year in the range
            let yearCheck = startDateDayjs.startOf('year');
            while (yearCheck.isBefore(endDateDayjs)) {
              const billDate = yearlyDate.year(yearCheck.year());
              if (billDate.isBetween(startDateDayjs, endDateDayjs, 'day', '[]')) {
                virtualTransactions.push({
                  description: bill.name,
                  amount: Number(bill.amount),
                  date: billDate.toISOString(),
                  type: 'expense',
                  category_id: bill.category_id,
                  category_name: bill.categories?.name || 'Uncategorized',
                  category_color: bill.categories?.color || '#6366F1',
                  category_icon: bill.categories?.icon || 'receipt',
                  is_virtual: true
                });
              }
              yearCheck = yearCheck.add(1, 'year');
            }
            continue;
          }

          // For monthly bills
          let currentMonth = startDateDayjs.startOf('month');
          while (currentMonth.isSameOrBefore(endDateDayjs)) {
            const billDate = bill.day === 1
              ? currentMonth.date(1)
              : currentMonth.date(bill.day);

            if (billDate.isBetween(startDateDayjs, endDateDayjs, 'day', '[]')) {
              virtualTransactions.push({
                description: bill.name,
                amount: Number(bill.amount),
                date: billDate.toISOString(),
                type: 'expense',
                category_id: bill.category_id,
                category_name: bill.categories?.name || 'Uncategorized',
                category_color: bill.categories?.color || '#6366F1',
                category_icon: bill.categories?.icon || 'receipt',
                is_virtual: true
              });
            }
            currentMonth = currentMonth.add(1, 'month');
          }
        }
      }

      console.log('[Transactions API] Virtual transactions generated:', {
        count: virtualTransactions.length,
        sampleDates: virtualTransactions.slice(0, 3).map(t => dayjs(t.date).format('YYYY-MM-DD HH:mm:ss'))
      });

      // Combine and format transactions
      const combinedTransactions = [
        ...actualTransactions.map(t => ({
          ...t,
          amount: Number(t.amount),
          date: dayjs(t.date).format('YYYY-MM-DD')
        })),
        ...virtualTransactions.map(t => ({
          ...t,
          date: dayjs(t.date).format('YYYY-MM-DD')
        }))
      ].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

      console.log('[Transactions API] Final response:', {
        actualTransactions: actualTransactions.length,
        virtualTransactions: virtualTransactions.length,
        totalTransactions: combinedTransactions.length,
        dateRange: {
          start: startDate ? dayjs(startDate).format('YYYY-MM-DD HH:mm:ss') : 'none',
          end: endDate ? dayjs(endDate).format('YYYY-MM-DD HH:mm:ss') : 'none'
        }
      });

      // Add cache control headers
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      return res.json(combinedTransactions);
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

      // Update all transactions with the same description and category to maintain consistency
      const oldDescription = existingTransaction.description.toLowerCase();
      const newDescription = req.body.description.toLowerCase();

      // Start a transaction to ensure all updates happen together
      let updatedTransaction;
      try {
        await db.transaction(async (tx) => {
          // First update the specific transaction
          [updatedTransaction] = await tx.update(transactions)
            .set({
              description: req.body.description,
              amount: req.body.amount,
              date: new Date(req.body.date),
              type: req.body.type,
              category_id: req.body.category_id
            })
            .where(eq(transactions.id, transactionId))
            .returning();

          // Then update all related transactions to maintain consistency
          if (oldDescription !== newDescription || existingTransaction.category_id !== req.body.category_id) {
            await tx.update(transactions)
              .set({
                description: req.body.description,
                category_id: req.body.category_id
              })
              .where(
                and(
                  eq(transactions.type, existingTransaction.type),
                  ilike(transactions.description, oldDescription),
                  eq(transactions.category_id, existingTransaction.category_id)
                )
              );
          }
        });
      } catch (error) {
        console.error('[Transactions API] Transaction update failed:', error);
        throw error;
      }

      console.log('[Transactions API] Successfully updated transaction:', updatedTransaction);

      // Add aggressive cache control headers
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

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
      const transactionId = parseInt(req.params.id, 10);
      if (isNaN(transactionId)) {
        return res.status(400).json({
          message: 'Invalid transaction ID',
          error: 'Transaction ID must be a number'
        });
      }

      console.log('[Transactions API] Attempting to delete transaction:', { id: transactionId });

      const transaction = await db.query.transactions.findFirst({
        where: eq(transactions.id, transactionId)
      });

      if (!transaction) {
        console.log('[Transactions API] Transaction not found:', { id: transactionId });
        return res.status(404).json({
          message: 'Transaction not found',
          error: `No transaction found with ID ${transactionId}`
        });
      }

      const deleted = await db.delete(transactions)
        .where(eq(transactions.id, transactionId))
        .returning();

      if (!deleted.length) {
        throw new Error(`Failed to delete transaction ${transactionId}`);
      }

      console.log('[Transactions API] Successfully deleted transaction:', {
        id: transactionId,
        deletedCount: deleted.length
      });

      return res.status(200).json({
        message: 'Transaction deleted successfully',
        deletedId: transactionId
      });
    } catch (error) {
      console.error('[Transactions API] Error in delete transaction handler:', {
        id: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return res.status(500).json({
        message: 'Failed to delete transaction',
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'Internal server error'
      });
    }
  });

  app.patch('/api/bills/:id', async (req, res) => {
    try {
      console.log('[Bills API] Updating bill:', {
        id: req.params.id,
        data: req.body
      });

      const billId = parseInt(req.params.id);
      const existingBill = await db.query.bills.findFirst({
        where: eq(bills.id, billId)
      });

      if (!existingBill) {
        return res.status(404).json({ message: 'Bill not found' });
      }

      // Update the bill
      const [updatedBill] = await db.update(bills)
        .set({
          name: req.body.name,
          amount: req.body.amount,
          day: req.body.day,
          category_id: req.body.category_id
        })
        .where(eq(bills.id, billId))
        .returning();

      // Also update any existing transactions that were generated from this bill
      // to maintain consistency in descriptions and amounts
      if (existingBill.name !== req.body.name) {
        await db.update(transactions)
          .set({
            description: req.body.name,
            category_id: req.body.category_id
          })
          .where(
            and(
              eq(transactions.category_id, existingBill.category_id),
              ilike(transactions.description, `%${existingBill.name}%`)
            )
          );
      }

      console.log('[Bills API] Successfully updated bill:', updatedBill);

      // Add cache control headers
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      res.json(updatedBill);
    } catch (error) {
      console.error('[Bills API] Error updating bill:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Invalid request data'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}