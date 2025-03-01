
import type { Express } from "express";
import { createServer, type Server } from "http";
import pool from "../db";

export function registerRoutes(app: Express): Server {
  app.get("/api/health", (req, res) => {
    console.log("[Server] Health check endpoint called");
    res.json({ status: "ok" });
  });

  app.get("/api/categories", async (req, res) => {
    try {
      console.log("[Categories API] Fetching categories...");
      const result = await pool.query('SELECT * FROM categories ORDER BY name');
      const allCategories = result.rows;
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
      const { name, color, icon } = req.body;
      
      const result = await pool.query(
        'INSERT INTO categories (name, color, icon) VALUES ($1, $2, $3) RETURNING *',
        [name, color, icon]
      );
      
      const newCategory = result.rows[0];
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

      const checkResult = await pool.query(
        'SELECT * FROM categories WHERE id = $1',
        [categoryId]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }

      const { name, color, icon } = req.body;
      const result = await pool.query(
        'UPDATE categories SET name = $1, color = $2, icon = $3 WHERE id = $4 RETURNING *',
        [name, color, icon, categoryId]
      );

      const updatedCategory = result.rows[0];
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

      const checkResult = await pool.query(
        'SELECT * FROM categories WHERE id = $1',
        [categoryId]
      );

      if (checkResult.rows.length === 0) {
        console.log("[Categories API] Category not found:", { id: categoryId });
        return res.status(404).json({
          message: "Category not found",
          error: `No category found with ID ${categoryId}`,
        });
      }

      // Begin transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Delete related bills
        await client.query('DELETE FROM bills WHERE category_id = $1', [categoryId]);
        
        // Delete the category
        const result = await client.query(
          'DELETE FROM categories WHERE id = $1 RETURNING id',
          [categoryId]
        );
        
        if (result.rows.length === 0) {
          throw new Error("Failed to delete category");
        }
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

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
      
      const query = `
        SELECT b.id, b.name, b.amount, b.day, b.category_id,
               c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM bills b
        LEFT JOIN categories c ON b.category_id = c.id
      `;
      
      const result = await pool.query(query);
      
      const formattedBills = result.rows.map(bill => ({
        id: bill.id,
        name: bill.name,
        amount: Number(bill.amount),
        day: bill.day,
        category_id: bill.category_id,
        category_name: bill.category_name || "General Expenses",
        category_color: bill.category_color || "#6366F1",
        category_icon: bill.category_icon || "shopping-cart",
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
            ? error instanceof Error
              ? error.message
              : "Internal server error"
            : "Internal server error",
      });
    }
  });

  app.post("/api/bills", async (req, res) => {
    try {
      console.log("[Bills API] Creating new bill:", req.body);
      const { name, amount, day, category_id } = req.body;
      
      const result = await pool.query(
        'INSERT INTO bills (name, amount, day, category_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, amount, day, category_id]
      );
      
      const newBill = result.rows[0];
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

      const checkResult = await pool.query(
        'SELECT * FROM bills WHERE id = $1',
        [billId]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: "Bill not found" });
      }

      const { name, amount, day, category_id } = req.body;
      const result = await pool.query(
        'UPDATE bills SET name = $1, amount = $2, day = $3, category_id = $4 WHERE id = $5 RETURNING *',
        [name, amount, day, category_id, billId]
      );

      const updatedBill = result.rows[0];
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

      const checkResult = await pool.query(
        'SELECT * FROM bills WHERE id = $1',
        [billId]
      );

      if (checkResult.rows.length === 0) {
        console.log("[Bills API] Bill not found:", { id: billId });
        return res.status(404).json({
          message: "Bill not found",
          error: `No bill found with ID ${billId}`,
        });
      }

      const result = await pool.query(
        'DELETE FROM bills WHERE id = $1 RETURNING id',
        [billId]
      );

      if (result.rows.length === 0) {
        throw new Error("Failed to delete bill");
      }

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
