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

import { Router } from 'express';
export const router = Router();

export function registerRoutes(app: Express): Server {
  app.get("/api/health", (req, res) => {
    console.log("[Server] Health check endpoint called");
    res.json({ status: "ok" });
  });

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

  app.post("/api/bills", async (req, res) => {
    try {
      console.log("[Bills API] Creating new bill:", req.body);
      const billData = await insertBillSchema.parseAsync(req.body);

      const [newBill] = await db
        .insert(bills)
        .values({
          ...billData,
          amount: billData.amount.toString()
        })
        .returning();

      console.log("[Bills API] Created bill:", newBill);
      res.status(201).json(newBill);
    } catch (error) {
      console.error("[Bills API] Error creating bill:", error);
      res.status(400).json({
        message: error instanceof Error ? error.message : "Invalid request data",
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
        .set(req.body)
        .where(eq(bills.id, billId))
        .returning();

      console.log("[Bills API] Updated bill:", updatedBill);
      res.json(updatedBill);
    } catch (error) {
      console.error("[Bills API] Error updating bill:", error);
      res.status(400).json({
        message: error instanceof Error ? error.message : "Invalid request data",
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

      await db.transaction(async (tx: typeof db) => {
        const result = await tx
          .delete(bills)
          .where(eq(bills.id, billId))
          .returning();

        if (!result.length) {
          throw new Error("Failed to delete bill");
        }
      });

      console.log("[Bills API] Successfully deleted bill:", {
        id: billId,
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

  return createServer(app);
}