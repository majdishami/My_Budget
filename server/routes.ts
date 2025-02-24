import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "../db";
import {
  categories,
  insertCategorySchema,
  transactions,
  bills,
  insertTransactionSchema,
  insertBillSchema,
} from "../db/schema";
import { eq, ilike, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);

export function registerRoutes(app: Express): Server {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    console.log("[Server] Health check endpoint called");
    res.json({ status: "ok" });
  });

  // Categories endpoints
  app.get("/api/categories", async (req, res) => {
    try {
      console.log("[Categories API] Fetching categories...");
      const allCategories = await db.query.categories.findMany({
        orderBy: [categories.name],
      });
      console.log("[Categories API] Found categories:", allCategories.length);
      return res.json(allCategories);
    } catch (error) {
      console.error("[Categories API] Error:", error);
      return res.status(500).json({
        message: "Failed to load categories",
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Internal server error"
            : "Internal server error",
      });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      console.log("[Categories API] Creating new category:", req.body);
      const categoryData = await insertCategorySchema.parseAsync(req.body);
      const [newCategory] = await db
        .insert(categories)
        .values(categoryData)
        .returning();
      console.log("[Categories API] Created category:", newCategory);
      res.status(201).json(newCategory);
    } catch (error) {
      console.error("[Categories API] Error creating category:", error);
      res.status(400).json({
        message:
          error instanceof Error ? error.message : "Invalid request data",
      });
    }
  });

  app.patch("/api/categories/:id", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      console.log("[Categories API] Updating category:", {
        id: categoryId,
        data: req.body,
      });

      const existingCategory = await db.query.categories.findFirst({
        where: eq(categories.id, categoryId),
      });

      if (!existingCategory) {
        return res.status(404).json({ message: "Category not found" });
      }

      const [updatedCategory] = await db
        .update(categories)
        .set(req.body)
        .where(eq(categories.id, categoryId))
        .returning();

      console.log("[Categories API] Updated category:", updatedCategory);
      res.json(updatedCategory);
    } catch (error) {
      console.error("[Categories API] Error updating category:", error);
      res.status(400).json({
        message:
          error instanceof Error ? error.message : "Invalid request data",
      });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      console.error("[Categories API] Invalid category ID:", req.params.id);
      return res.status(400).json({
        message: "Invalid category ID",
        error: "Category ID must be a number",
      });
    }

    try {
      console.log("[Categories API] Attempting to delete category:", {
        id: categoryId,
      });

      const category = await db.query.categories.findFirst({
        where: eq(categories.id, categoryId),
      });

      if (!category) {
        console.log("[Categories API] Category not found:", { id: categoryId });
        return res.status(404).json({
          message: "Category not found",
          error: `No category found with ID ${categoryId}`,
        });
      }

      await db.transaction(async (tx: any) => {
        await tx.delete(bills).where(eq(bills.category_id, categoryId));
        const result = await tx
          .delete(categories)
          .where(eq(categories.id, categoryId))
          .returning();

        if (!result.length) {
          throw new Error("Failed to delete category");
        }
      });

      console.log("[Categories API] Successfully deleted category:", {
        id: categoryId,
        relatedRecordsDeleted: true,
      });

      return res.status(200).json({
        message: "Category deleted successfully",
        deletedId: categoryId,
      });
    } catch (error) {
      console.error("[Categories API] Error in delete category handler:", {
        id: categoryId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return res.status(500).json({
        message: "Failed to delete category",
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Internal server error"
            : "Internal server error",
      });
    }
  });

  // Bills endpoints
  app.get("/api/bills", async (req, res) => {
    try {
      console.log("[Bills API] Fetching bills with categories...");
      const allBills = await db.query.bills.findMany({
        columns: {
          id: true,
          name: true,
          amount: true,
          day: true,
          category_id: true,
        },
        with: {
          category: {
            columns: {
              name: true,
              color: true,
              icon: true,
            },
          },
        },
      });

      const formattedBills = allBills.map((bill: any) => ({
        id: bill.id,
        name: bill.name,
        amount: Number(bill.amount),
        day: bill.day,
        category_id: bill.category_id,
        category_name: bill.category?.name || "General Expenses",
        category_color: bill.category?.color || "#6366F1",
        category_icon: bill.category?.icon || "shopping-cart",
      }));

      console.log("[Bills API] Found bills:", formattedBills.length);

      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");

      return res.json(formattedBills);
    } catch (error) {
      console.error("[Bills API] Error:", error);
      return res.status(500).json({
        message: "Failed to load bills",
        error:
          process.env.NODE_ENV === "development"
            ? error
            : "Internal server error",
      });
    }
  });

  // Transactions endpoints
  app.get("/api/transactions", async (req, res) => {
    try {
      const type = req.query.type as "income" | "expense" | undefined;
      const startDate = req.query.startDate
        ? dayjs(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? dayjs(req.query.endDate as string)
        : undefined;

      console.log("[Transactions API] Fetching transactions with filters:", {
        type,
        startDate: startDate?.format("YYYY-MM-DD HH:mm:ss"),
        endDate: endDate?.format("YYYY-MM-DD HH:mm:ss"),
        rawStartDate: req.query.startDate,
        rawEndDate: req.query.endDate,
      });

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
          category_icon: sql<string>`COALESCE(${categories.icon}, 'receipt')`,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.category_id, categories.id));

      const whereConditions: any[] = [];

      if (type) {
        whereConditions.push(eq(transactions.type, type));
      }

      if (startDate) {
        whereConditions.push(
          sql`DATE(${transactions.date}) >= DATE(${startDate.toDate()})`
        );
      }

      if (endDate) {
        whereConditions.push(
          sql`DATE(${transactions.date}) <= DATE(${endDate.toDate()})`
        );
      }

      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }

      const actualTransactions = await query;

      let virtualTransactions: any[] = [];

      if (startDate && endDate) {
        const allBills = await db.query.bills.findMany({
          columns: {
            id: true,
            name: true,
            amount: true,
            day: true,
            is_one_time: true,
            yearly_date: true,
            category_id: true,
          },
          with: {
            category: {
              columns: {
                name: true,
                color: true,
                icon: true,
              },
            },
          },
        });

        for (const bill of allBills) {
          const billData = bill;

          if (billData.is_one_time && billData.date) {
            const billDate = dayjs(billData.date);
            if (billDate.isBetween(startDate, endDate, "day", "[]")) {
              virtualTransactions.push({
                id: `bill_${billData.id}_${billDate.format("YYYY-MM-DD")}`,
                description: billData.name,
                amount: Number(billData.amount),
                date: billDate.format("YYYY-MM-DD"),
                type: "expense",
                category_id: billData.category_id,
                category_name: bill.category?.name || "Uncategorized",
                category_color: bill.category?.color || "#6366F1",
                category_icon: bill.category?.icon || "receipt",
                is_virtual: true,
              });
            }
            continue;
          }

          if (billData.is_yearly && billData.yearly_date) {
            const yearlyDate = dayjs(billData.yearly_date);
            let yearCheck: dayjs.Dayjs = startDate.startOf("year");

            while (yearCheck.isBefore(endDate)) {
              const billDate = yearlyDate.year(yearCheck.year());
              if (billDate.isBetween(startDate, endDate, "day", "[]")) {
                virtualTransactions.push({
                  id: `bill_${billData.id}_${billDate.format("YYYY-MM-DD")}`,
                  description: billData.name,
                  amount: Number(billData.amount),
                  date: billDate.format("YYYY-MM-DD"),
                  type: "expense",
                  category_id: billData.category_id,
                  category_name: bill.category?.name || "Uncategorized",
                  category_color: bill.category?.color || "#6366F1",
                  category_icon: bill.category?.icon || "receipt",
                  is_virtual: true,
                });
              }
              yearCheck = yearCheck.add(1, "year");
            }
            continue;
          }

          let currentMonth: dayjs.Dayjs = startDate.startOf("month");
          while (currentMonth.isSameOrBefore(endDate)) {
            const billDate =
              billData.day === 1
                ? currentMonth.startOf("month")
                : currentMonth.date(billData.day);

            if (billDate.isBetween(startDate, endDate, "day", "[]")) {
              virtualTransactions.push({
                id: `bill_${billData.id}_${billDate.format("YYYY-MM-DD")}`,
                description: billData.name,
                amount: Number(billData.amount),
                date: billDate.format("YYYY-MM-DD"),
                type: "expense",
                category_id: billData.category_id,
                category_name: bill.category?.name || "Uncategorized",
                category_color: bill.category?.color || "#6366F1",
                category_icon: bill.category?.icon || "receipt",
                is_virtual: true,
              });
            }
            currentMonth = currentMonth.add(1, "month");
          }
        }

        for (const transaction of actualTransactions) {
          if (!transaction.is_recurring) continue;

          const baseTransaction = {
            ...transaction,
            amount: Number(transaction.amount),
            is_virtual: true,
          };

          if (transaction.description === "Ruba's Salary") {
            let currentDate: dayjs.Dayjs = startDate.clone();
            while (currentDate.day() !== 5) {
              currentDate = currentDate.add(1, "day");
            }

            while (currentDate.isSameOrBefore(endDate)) {
              if (currentDate.isBetween(startDate, endDate, "day", "[]")) {
                virtualTransactions.push({
                  ...baseTransaction,
                  date: currentDate.format("YYYY-MM-DD"),
                  id: `${transaction.id}_${currentDate.format("YYYY-MM-DD")}`,
                });
              }
              currentDate = currentDate.add(14, "days");
            }
            continue;
          }

          const originalDate = dayjs(transaction.date);
          const dayOfMonth =
            transaction.recurring_type === "twice-monthly"
              ? originalDate.date()
              : undefined;

          let currentMonth: dayjs.Dayjs = startDate.startOf("month");
          while (currentMonth.isSameOrBefore(endDate)) {
            if (
              transaction.recurring_type === "twice-monthly" &&
              transaction.first_date &&
              transaction.second_date
            ) {
              const firstDate = currentMonth.date(transaction.first_date);
              const secondDate = currentMonth.date(transaction.second_date);

              if (firstDate.isBetween(startDate, endDate, "day", "[]")) {
                virtual transactions.push({
                  ...baseTransaction,
                  date: firstDate.format("YYYY-MM-DD"),
                  id: `${transaction.id}_${firstDate.format("YYYY-MM-DD")}`,
                });
              }

              if (secondDate.isBetween(startDate, endDate, "day", "[]")) {
                virtualTransactions.push({
                  ...baseTransaction,
                  date: secondDate.format("YYYY-MM-DD"),
                  id: `${transaction.id}_${secondDate.format("YYYY-MM-DD")}`,
                });
              }
            } else if (dayOfMonth) {
              const transactionDate = currentMonth.date(dayOfMonth);
              if (transactionDate.isBetween(startDate, endDate, "day", "[]")) {
                virtualTransactions.push({
                  ...baseTransaction,
                  date: transactionDate.format("YYYY-MM-DD"),
                  id: `${transaction.id}_${transactionDate.format("YYYY-MM-DD")}`,
                });
              }
            }
            currentMonth = currentMonth.add(1, "month");
          }
        }
      }
      console.log("[Transactions API] Generated virtual transactions:", {
        count: virtualTransactions.length,
        sampleDates: virtualTransactions.slice(0, 3).map((t) => t.date),
      });

      const combinedTransactions = [
        ...actualTransactions.map((t: any) => ({
          ...t,
          amount: Number(t.amount),
          date: dayjs(t.date).format("YYYY-MM-DD"),
        })),
        ...virtualTransactions,
      ].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");

      return res.json(combinedTransactions);
    } catch (error) {
      console.error("[Transactions API] Error:", error);
      return res.status(500).json({
        message: "Failed to load transactions",
        error:
          process.env.NODE_ENV === "development"
            ? error
            : "Internal server error",
      });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      console.log("[Transactions API] Creating new transaction:", req.body);
      const transactionData = await insertTransactionSchema.parseAsync(req.body);
      const isRecurring =
        transactionData.recurring_type && transactionData.recurring_type !== "once";

      console.log("[Transactions API] Processing transaction with recurring info:", {
        recurring_type: transactionData.recurring_type,
        is_recurring: isRecurring,
      });

      const [newTransaction] = await db
        .insert(transactions)
        .values({
          description: transactionData.description,
          amount: transactionData.amount,
          date: new Date(transactionData.date),
          type: transactionData.type,
          category_id: transactionData.category_id,
          recurring_type: transactionData.recurring_type || null,
          is_recurring: isRecurring,
          first_date: transactionData.first_date || null,
          second_date: transactionData.second_date || null,
        })
        .returning();

      console.log("[Transactions API] Created transaction:", newTransaction);
      res.status(201).json(newTransaction);
    } catch (error) {
      console.error("[Transactions API] Error creating transaction:", error);
      res.status(400).json({
        message:
          error instanceof Error ? error.message : "Invalid request data",
      });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      console.log("[Transactions API] Updating transaction:", {
        id: transactionId,
        data: req.body,
      });

      const existingTransaction = await db.query.transactions.findFirst({
        where: eq(transactions.id, transactionId),
      });

      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const oldDescription = existingTransaction.description.toLowerCase();
      const newDescription = req.body.description.toLowerCase();

      let updatedTransaction;

      try {
        await db.transaction(async (tx: any) => {
          updatedTransaction = await tx
            .update(transactions)
            .set({
              description: req.body.description,
              amount: req.body.amount,
              date: new Date(req.body.date),
              type: req.body.type,
              category_id: req.body.category_id,
            })
            .where(eq(transactions.id, transactionId))
            .returning();

          if (
            oldDescription !== newDescription ||
            existingTransaction.category_id !== req.body.category_id
          ) {
            await tx
              .update(transactions)
              .set({
                description: req.body.description,
                category_id: req.body.category_id,
              })
              .where(
                and(
                  eq(transactions.type, existingTransaction.type),
                  ilike(transactions.description, `%${oldDescription}%`),
                  eq(transactions.category_id, existingTransaction.category_id)
                )
              );
          }
        });

        console.log(
          "[Transactions API] Successfully updated transaction:",
          updatedTransaction
        );

        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");

        res.json(updatedTransaction);
      } catch (error) {
        console.error("[Transactions API] Transaction update failed:", error);
        throw error;
      }
    } catch (error) {
      console.error("[Transactions API] Error updating transaction:", error);
      res.status(400).json({
        message:
          error instanceof Error ? error.message : "Invalid request data",
      });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id, 10);

      if (isNaN(transactionId)) {
        return res.status(400).json({
          message: "Invalid transaction ID",
          error: "Transaction ID must be a number",
        });
      }

      console.log("[Transactions API] Attempting to delete transaction:", {
        id: transactionId,
      });

      const transaction = await db.query.transactions.findFirst({
        where: eq(transactions.id, transactionId),
      });

      if (!transaction) {
        console.log("[Transactions API] Transaction not found:", {
          id: transactionId,
        });
        return res.status(404).json({
          message: "Transaction not found",
          error: `No transaction found with ID ${transactionId}`,
        });
      }

      const deleted = await db
        .delete(transactions)
        .where(eq(transactions.id, transactionId))
        .returning();

      if (!deleted.length) {
        throw new Error(`Failed to delete transaction ${transactionId}`);
      }

      console.log("[Transactions API] Successfully deleted transaction:", {
        id: transactionId,
        deletedCount: deleted.length,
      });

      return res.status(200).json({
        message: "Transaction deleted successfully",
        deletedId: transactionId,
      });
    } catch (error) {
      console.error("[Transactions API] Error in delete transaction handler:", {
        id: req.params.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return res.status(500).json({
        message: "Failed to delete transaction",
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Internal server error"
            : "Internal server error",
      });
    }
  });

  app.patch("/api/bills/:id", async (req, res) => {
    try {
      const billId = parseInt(req.params.id);
      console.log("[Bills API] Updating bill:", {
        id: billId,
        data: req.body,
      });

      const existingBill = await db.query.bills.findFirst({
        where: eq(bills.id, billId),
      });

      if (!existingBill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      const [updatedBill] = await db
        .update(bills)
        .set({
          name: req.body.name,
          amount: req.body.amount,
          day: req.body.day,
          category_id: req.body.category_id,
        })
        .where(eq(bills.id, billId))
        .returning();

      if (existingBill.name !== req.body.name) {
        await db
          .update(transactions)
          .set({
            description: req.body.name,
            category_id: req.body.category_id,
          })
          .where(
            and(
              eq(transactions.category_id, existingBill.category_id),
              ilike(transactions.description, `%${existingBill.name}%`)
            )
          );
      }

      console.log("[Bills API] Successfully updated bill:", updatedBill);

      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");

      res.json(updatedBill);
    } catch (error) {
      console.error("[Bills API] Error updating bill:", error);
      res.status(400).json({
        message:
          error instanceof Error ? error.message : "Invalid request data",
      });
    }
  });

  // Additional routes for bills
  app.post("/api/bills", async (req, res) => {
    try {
      console.log("[Bills API] Creating new bill:", req.body);
      const billData = await insertBillSchema.parseAsync(req.body);
      const [newBill] = await db
        .insert(bills)
        .values(billData)
        .returning();
      console.log("[Bills API] Created bill:", newBill);
      res.status(201).json(newBill);
    } catch (error) {
      console.error("[Bills API] Error creating bill:", error);
      res.status(400).json({
        message:
          error instanceof Error ? error.message : "Invalid request data",
      });
    }
  });

  app.delete("/api/bills/:id", async (req, res) => {
    const billId = parseInt(req.params.id);

    if (isNaN(billId)) {
      console.error("[Bills API] Invalid bill ID:", req.params.id);
      return res.status(400).json({
        message: "Invalid bill ID",
        error: "Bill ID must be a number",
      });
    }

    try {
      console.log("[Bills API] Attempting to delete bill:", {
        id: billId,
      });

      const bill = await db.query.bills.findFirst({
        where: eq(bills.id, billId),
      });

      if (!bill) {
        console.log("[Bills API] Bill not found:", { id: billId });
        return res.status(404).json({
          message: "Bill not found",
          error: `No bill found with ID ${billId}`,
        });
      }

      const deleted = await db
        .delete(bills)
        .where(eq(bills.id, billId))
        .returning();

      if (!deleted.length) {
        throw new Error("Failed to delete bill");
      }

      console.log("[Bills API] Successfully deleted bill:", {
        id: billId,
        deletedCount: deleted.length,
      });

      return res.status(200).json({
        message: "Bill deleted successfully",
        deletedId: billId,
      });
    } catch (error) {
      console.error("[Bills API] Error in delete bill handler:", {
        id: billId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return res.status(500).json({
        message: "Failed to delete bill",
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Internal server error"
            : "Internal server error",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}