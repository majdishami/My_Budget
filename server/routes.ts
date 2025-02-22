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
      const startDate = req.query.startDate ? dayjs(req.query.startDate as string).startOf('day') : undefined;
      const endDate = req.query.endDate ? dayjs(req.query.endDate as string).endOf('day') : undefined;

      console.log('[Transactions API] Fetching transactions with filters:', {
        type,
        startDate: startDate?.format('YYYY-MM-DD HH:mm:ss'),
        endDate: endDate?.format('YYYY-MM-DD HH:mm:ss'),
        rawStartDate: req.query.startDate,
        rawEndDate: req.query.endDate
      });

      // Build base query for actual transactions
      let query = db
        .select({
          id: transactions.id,
          description: transactions.description,
          amount: transactions.amount,
          date: transactions.date,
          type: transactions.type,
          category_id: transactions.category_id,
          recurring_type: transactions.recurring_type,
          is_recurring: transactions.is_recurring,
          first_date: transactions.first_date,
          second_date: transactions.second_date,
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
        whereConditions.push(sql`DATE(${transactions.date}) >= DATE(${startDate.toDate()})`);
      }
      if (endDate) {
        whereConditions.push(sql`DATE(${transactions.date}) <= DATE(${endDate.toDate()})`);
      }

      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }

      const actualTransactions = await query;

      // Generate virtual transactions for recurring incomes and expenses
      let virtualTransactions: any[] = [];
      if (startDate && endDate) {
        // Process bills first
        const allBills = await db.select({
          id: bills.id,
          bills: bills,
          categories: categories
        }).from(bills).leftJoin(categories, eq(bills.category_id, categories.id));

        // Process each bill
        for (const bill of allBills) {
          const billData = bill.bills;

          // For one-time bills
          if (billData.is_one_time && billData.date) {
            const billDate = dayjs(billData.date);
            if (billDate.isBetween(startDate, endDate, 'day', '[]')) {
              virtualTransactions.push({
                id: `bill_${billData.id}_${billDate.format('YYYY-MM-DD')}`,
                description: billData.name,
                amount: Number(billData.amount),
                date: billDate.format('YYYY-MM-DD'),
                type: 'expense',
                category_id: billData.category_id,
                category_name: bill.categories?.name || 'Uncategorized',
                category_color: bill.categories?.color || '#6366F1',
                category_icon: bill.categories?.icon || 'receipt',
                is_virtual: true
              });
            }
            continue;
          }

          // For yearly bills
          if (billData.is_yearly && billData.yearly_date) {
            const yearlyDate = dayjs(billData.yearly_date);
            // Check for each year in the range
            let yearCheck = startDate.startOf('year');
            while (yearCheck.isBefore(endDate)) {
              const billDate = yearlyDate.year(yearCheck.year());
              if (billDate.isBetween(startDate, endDate, 'day', '[]')) {
                virtualTransactions.push({
                  id: `bill_${billData.id}_${billDate.format('YYYY-MM-DD')}`,
                  description: billData.name,
                  amount: Number(billData.amount),
                  date: billDate.format('YYYY-MM-DD'),
                  type: 'expense',
                  category_id: billData.category_id,
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
          let currentMonth = startDate.startOf('month');
          while (currentMonth.isSameOrBefore(endDate)) {
            const billDate = billData.day === 1
              ? currentMonth.date(1)
              : currentMonth.date(billData.day);

            if (billDate.isBetween(startDate, endDate, 'day', '[]')) {
              virtualTransactions.push({
                id: `bill_${billData.id}_${billDate.format('YYYY-MM-DD')}`,
                description: billData.name,
                amount: Number(billData.amount),
                date: billDate.format('YYYY-MM-DD'),
                type: 'expense',
                category_id: billData.category_id,
                category_name: bill.categories?.name || 'Uncategorized',
                category_color: bill.categories?.color || '#6366F1',
                category_icon: bill.categories?.icon || 'receipt',
                is_virtual: true
              });
            }
            currentMonth = currentMonth.add(1, 'month');
          }
        }

        // Process recurring transactions (incomes)
        for (const transaction of actualTransactions) {
          if (!transaction.is_recurring) continue;

          const baseTransaction = {
            ...transaction,
            amount: Number(transaction.amount),
            is_virtual: true
          };

          // Special handling for Ruba's salary (biweekly on Fridays)
          if (transaction.description === "Ruba's Salary") {
            let currentDate = startDate.clone();
            // Ensure we start on a Friday
            while (currentDate.day() !== 5) { // 5 is Friday
              currentDate = currentDate.add(1, 'day');
            }

            while (currentDate.isSameOrBefore(endDate)) {
              if (currentDate.isBetween(startDate, endDate, 'day', '[]')) {
                virtualTransactions.push({
                  ...baseTransaction,
                  date: currentDate.format('YYYY-MM-DD'),
                  id: `${transaction.id}_${currentDate.format('YYYY-MM-DD')}`
                });
              }
              // Add two weeks to get to next payday
              currentDate = currentDate.add(14, 'days');
            }
            continue;
          }

          // Handle other recurring transactions as before
          const originalDate = dayjs(transaction.date);
          const dayOfMonth = transaction.recurring_type === 'twice-monthly'
            ? null // Handle twice-monthly separately
            : originalDate.date();

          let currentMonth = startDate.startOf('month');

          while (currentMonth.isSameOrBefore(endDate)) {
            if (transaction.recurring_type === 'twice-monthly' && transaction.first_date && transaction.second_date) {
              // Handle twice-monthly transactions
              const firstDate = currentMonth.date(transaction.first_date);
              const secondDate = currentMonth.date(transaction.second_date);

              if (firstDate.isBetween(startDate, endDate, 'day', '[]')) {
                virtualTransactions.push({
                  ...baseTransaction,
                  date: firstDate.format('YYYY-MM-DD'),
                  id: `${transaction.id}_${firstDate.format('YYYY-MM-DD')}`
                });
              }

              if (secondDate.isBetween(startDate, endDate, 'day', '[]')) {
                virtualTransactions.push({
                  ...baseTransaction,
                  date: secondDate.format('YYYY-MM-DD'),
                  id: `${transaction.id}_${secondDate.format('YYYY-MM-DD')}`
                });
              }
            } else if (dayOfMonth) {
              // Handle monthly transactions
              const transactionDate = currentMonth.date(dayOfMonth);

              if (transactionDate.isBetween(startDate, endDate, 'day', '[]')) {
                virtualTransactions.push({
                  ...baseTransaction,
                  date: transactionDate.format('YYYY-MM-DD'),
                  id: `${transaction.id}_${transactionDate.format('YYYY-MM-DD')}`
                });
              }
            }

            currentMonth = currentMonth.add(1, 'month');
          }
        }
      }

      console.log('[Transactions API] Generated virtual transactions:', {
        count: virtualTransactions.length,
        sampleDates: virtualTransactions.slice(0, 3).map(t => t.date)
      });

      // Combine and format all transactions
      const combinedTransactions = [
        ...actualTransactions.map(t => ({
          ...t,
          amount: Number(t.amount),
          date: dayjs(t.date).format('YYYY-MM-DD')
        })),
        ...virtualTransactions
      ].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

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

      // Explicitly determine if transaction is recurring
      481|       const isRecurring = transactionData.recurring_type && transactionData.recurring_type !== 'once';
482| 
483|       console.log('[Transactions API] Processing transaction with recurring info:', {
484|         recurring_type: transactionData.recurring_type,
485|         is_recurring: isRecurring
486|       });
487| 
488|       // Create the transaction with recurring fields
489|       const [newTransaction] = await db.insert(transactions)
490|         .values({
491|           description: transactionData.description,
492|           amount: transactionData.amount,
493|           date: new Date(transactionData.date),
494|           type: transactionData.type,
495|           category_id: transactionData.category_id,
496|           recurring_type: transactionData.recurring_type || null,
497|           is_recurring: isRecurring,
498|           first_date: transactionData.first_date || null,
499|           second_date: transactionData.second_date || null
500|         })
501|         .returning();
502| 
503|       console.log('[Transactions API] Created transaction:', newTransaction);
504|       res.status(201).json(newTransaction);
505|     } catch (error) {
506|       console.error('[Transactions API] Error creating transaction:', error);
507|       res.status(400).json({
508|         message: error instanceof Error ? error.message : 'Invalid request data'
509|       });
510|     }
511|   });
512| 
513|   app.patch('/api/transactions/:id', async (req, res) => {
514|     try {
515|       console.log('[Transactions API] Updating transaction:', {
516|         id: req.params.id,
517|         data: req.body
518|       });
519| 
520|       const transactionId = parseInt(req.params.id);
521|       const existingTransaction = await db.query.transactions.findFirst({
522|         where: eq(transactions.id, transactionId)
523|       });
524| 
525|       if (!existingTransaction) {
526|         return res.status(404).json({ message: 'Transaction not found' });
527|       }
528| 
529|       // Update all transactions with the same description and category to maintain consistency
530|       const oldDescription = existingTransaction.description.toLowerCase();
531|       const newDescription = req.body.description.toLowerCase();
532| 
533|       // Start a transaction to ensure all updates happen together
534|       let updatedTransaction;
535|       try {
536|         await db.transaction(async (tx) => {
537|           // First update the specific transaction
538|           [updatedTransaction] = await tx.update(transactions)
539|             .set({
540|               description: req.body.description,
541|               amount: req.body.amount,
542|               date: new Date(req.body.date),
543|               type: req.body.type,
544|               category_id: req.body.category_id
545|             })
546|             .where(eq(transactions.id, transactionId))
547|             .returning();
548| 
549|           // Then update all related transactions to maintain consistency
550|           if (oldDescription !== newDescription || existingTransaction.category_id !== req.body.category_id) {
551|             await tx.update(transactions)
552|               .set({
553|                 description: req.body.description,
554|                 category_id: req.body.category_id
555|               })
556|               .where(
557|                 and(
558|                   eq(transactions.type, existingTransaction.type),
559|                   ilike(transactions.description, oldDescription),
560|                   eq(transactions.category_id, existingTransaction.category_id)
561|                 )
562|               );
563|           }
564|         });
565|       } catch (error) {
566|         console.error('[Transactions API] Transaction update failed:', error);
567|         throw error;
568|       }
569| 
570|       console.log('[Transactions API] Successfully updated transaction:', updatedTransaction);
571| 
572|       // Add aggressive cache control headers
573|       res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
574|       res.set('Pragma', 'no-cache');
575|       res.set('Expires', '0');
576| 
577|       res.json(updatedTransaction);
578|     } catch (error) {
579|       console.error('[Transactions API] Error updating transaction:', error);
580|       res.status(400).json({
581|         message: error instanceof Error ? error.message : 'Invalid request data'
582|       });
583|     }
584|   });
585| 
586|   app.delete('/api/transactions/:id', async (req, res) => {
587|     try {
588|       const transactionId = parseInt(req.params.id, 10);
589|       if (isNaN(transactionId)) {
590|         return res.status(400).json({
591|           message: 'Invalid transaction ID',
592|           error: 'Transaction ID must be a number'
593|         });
594|       }
595| 
596|       console.log('[Transactions API] Attempting to delete transaction:', { id: transactionId });
597| 
598|       const transaction = await db.query.transactions.findFirst({
599|         where: eq(transactions.id, transactionId)
600|       });
601| 
602|       if (!transaction) {
603|         console.log('[Transactions API] Transaction not found:', { id: transactionId });
604|         return res.status(404).json({
605|           message: 'Transaction not found',
606|           error: `No transaction found with ID ${transactionId}`
607|         });
608|       }
609| 
610|       const deleted = await db.delete(transactions)
611|         .where(eq(transactions.id, transactionId))
612|         .returning();
613| 
614|       if (!deleted.length) {
615|         throw new Error(`Failed to delete transaction ${transactionId}`);
616|       }
617| 
618|       console.log('[Transactions API] Successfully deleted transaction:', {
619|         id: transactionId,
620|         deletedCount: deleted.length
621|       });
622| 
623|       return res.status(200).json({
624|         message: 'Transaction deleted successfully',
625|         deletedId: transactionId
626|       });
627|     } catch (error) {
628|       console.error('[Transactions API] Error in delete transaction handler:', {
629|         id: req.params.id,
630|         error: error instanceof Error ? error.message : 'Unknown error'
631|       });
632| 
633|       return res.status(500).json({
634|         message: 'Failed to delete transaction',
635|         error: process.env.NODE_ENV === 'development'
636|           ? (error instanceof Error ? error.message : 'Unknown error')
637|           : 'Internal server error'
638|       });
639|     }
640|   });
641| 
642|   app.patch('/api/bills/:id', async (req, res) => {
643|     try {
644|       console.log('[Bills API] Updating bill:', {
645|         id: req.params.id,
646|         data: req.body
647|       });
648| 
649|       const billId = parseInt(req.params.id);
650|       const existingBill = await db.query.bills.findFirst({
651|         where: eq(bills.id, billId)
652|       });
653| 
654|       if (!existingBill) {
655|         return res.status(404).json({ message: 'Bill not found' });
656|       }
657| 
658|       // Update the bill
659|       const [updatedBill] = await db.update(bills)
660|         .set({
661|           name: req.body.name,
662|           amount: req.body.amount,
663|           day: req.body.day,
664|           category_id: req.body.category_id
665|         })
666|         .where(eq(bills.id, billId))
667|         .returning();
668| 
669|       // Also update any existing transactions that were generated from this bill
670|       // to maintain consistency in descriptions and amounts
671|       if (existingBill.name !== req.body.name) {
672|         await db.update(transactions)
673|           .set({
674|             description: req.body.name,
675|             category_id: req.body.category_id
676|           })
677|           .where(
678|             and(
679|               eq(transactions.category_id, existingBill.category_id),
680|               ilike(transactions.description, `%${existingBill.name}%`)
681|             )
682|           );
683|       }
684| 
685|       console.log('[Bills API] Successfully updated bill:', updatedBill);
686| 
687|       // Add cache control headers
688|       res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
689|       res.set('Pragma', 'no-cache');
690|       res.set('Expires', '0');
691| 
692|       res.json(updatedBill);
693|     } catch (error) {
694|       console.error('[Bills API] Error updating bill:', error);
695|       res.status(400).json({
696|         message: error instanceof Error ? error.message : 'Invalid request data'
697|       });
698|     }
699|   });
700| 
701|   const httpServer = createServer(app);
702|   return httpServer;
703| }
704| 