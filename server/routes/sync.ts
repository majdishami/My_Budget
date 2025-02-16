import { Router } from 'express';
import { generateDatabaseBackup } from '../utils/db-sync';
import path from 'path';
import fs from 'fs';
import type { UploadedFile } from 'express-fileupload';
import { db } from '@db';
import { bills, transactions, categories } from '@db/schema';
import { sql } from 'drizzle-orm';

const router = Router();

const validateAndPreprocessData = (data: any) => {
  try {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid backup format: data must be a JSON object');
    }

    // Handle optional session array
    if ('session' in data && !Array.isArray(data.session)) {
      data.session = [];
    }

    // Check required arrays exist
    const requiredArrays = ['categories', 'bills', 'transactions'];
    for (const arrayName of requiredArrays) {
      if (!Array.isArray(data[arrayName])) {
        throw new Error(`Invalid backup format: "${arrayName}" must be an array`);
      }
    }

    // Process and validate categories
    data.categories = data.categories.map((category: any) => {
      if (!category.id || !category.name || !category.color || !category.icon) {
        throw new Error(`Invalid category format: Each category must have id, name, color, and icon fields`);
      }
      // Remove created_at if present to let DB handle it
      const { created_at, ...rest } = category;
      return rest;
    });

    // Create a set of category IDs for reference
    const categoryIds = new Set(data.categories.map((cat: any) => cat.id));

    // Process and validate bills
    data.bills = data.bills.map((bill: any) => {
      if (!bill.id || !bill.name || !bill.amount || typeof bill.day !== 'number') {
        throw new Error(`Invalid bill format: Each bill must have id, name, amount, and day fields`);
      }
      // Remove created_at if present to let DB handle it
      const { created_at, ...rest } = bill;
      if (rest.category_id && !categoryIds.has(rest.category_id)) {
        console.warn(`Warning: Bill "${rest.name}" references non-existent category ${rest.category_id}`);
        rest.category_id = 17; // Default to General Expenses if category not found
      }
      return rest;
    });

    // Process and validate transactions
    data.transactions = data.transactions.map((transaction: any) => {
      if (!transaction.id || !transaction.description || !transaction.amount || !transaction.date) {
        throw new Error(`Invalid transaction format: Each transaction must have id, description, amount, and date fields`);
      }

      // Format date string to match SQL timestamp format
      const { created_at, date, ...rest } = transaction;
      let formattedDate;
      try {
        // Ensure date is in the correct format for PostgreSQL
        const dateObj = new Date(date);
        formattedDate = dateObj.toISOString().split('T')[0] + ' ' + dateObj.toTimeString().split(' ')[0];
      } catch (error) {
        console.error(`Error formatting date for transaction ${transaction.id}:`, error);
        formattedDate = date; // Keep original format if parsing fails
      }

      // Ensure type is either 'expense' or 'income'
      if (!rest.type || !['expense', 'income'].includes(rest.type)) {
        console.warn(`Warning: Transaction "${rest.description}" has invalid type, defaulting to 'expense'`);
        rest.type = 'expense';
      }

      // Set default category if missing or invalid
      if (!rest.category_id || !categoryIds.has(rest.category_id)) {
        console.warn(`Warning: Transaction "${rest.description}" missing or has invalid category, using General Expenses`);
        rest.category_id = 17; // Default to General Expenses
      }

      return {
        ...rest,
        date: formattedDate
      };
    });

    return data;
  } catch (error) {
    console.error('Data validation error:', error);
    throw error;
  }
};

// Backup endpoint
router.post('/api/sync/backup', async (req, res) => {
  try {
    const result = await generateDatabaseBackup();

    if (!result.success) {
      console.error('Backup generation failed:', result.error);
      return res.status(500).json({ 
        error: result.error || 'Failed to generate backup' 
      });
    }

    res.json({
      message: 'Backup generated successfully',
      downloadUrl: `/api/sync/download/${result.fileName}`
    });
  } catch (error) {
    console.error('Error in backup endpoint:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

// Download endpoint
router.get('/api/sync/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'tmp', filename);

    if (!fs.existsSync(filePath)) {
      console.error('Missing backup file:', filePath);
      return res.status(404).json({ error: 'Backup file not found' });
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error downloading backup file' });
        }
      }

      // Clean up the file after download
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting temporary file:', unlinkErr);
        }
      });
    });
  } catch (error) {
    console.error('Error in download endpoint:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
    }
  }
});

// Restore endpoint
router.post('/api/sync/restore', async (req, res) => {
  let tempPath = '';

  try {
    if (!req.files?.backup || Array.isArray(req.files.backup)) {
      return res.status(400).json({ error: 'No backup file provided' });
    }

    const uploadedFile = req.files.backup as UploadedFile;
    console.log('Received file:', {
      name: uploadedFile.name,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype
    });

    // Create tmp directory if it doesn't exist
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Generate a unique filename
    tempPath = path.join(tmpDir, `restore_${Date.now()}.json`);

    try {
      // Move the uploaded file to tmp directory
      await uploadedFile.mv(tempPath);
      console.log('Backup file saved to:', tempPath);

      // Read and parse file content
      const fileContent = fs.readFileSync(tempPath, 'utf8');
      console.log('File content length:', fileContent.length);

      try {
        // Parse and preprocess the data
        const parsedData = JSON.parse(fileContent);
        console.log('Data parsed successfully, preprocessing data...');

        const processedData = validateAndPreprocessData(parsedData);
        console.log('Data validation and preprocessing completed');

        // Start transaction for atomic restore
        await db.transaction(async (tx) => {
          // Restore categories first
          if (processedData.categories.length > 0) {
            console.log('Restoring categories...');
            await tx.insert(categories).values(processedData.categories)
              .onConflictDoUpdate({
                target: [categories.id],
                set: {
                  name: sql`EXCLUDED.name`,
                  color: sql`EXCLUDED.color`,
                  icon: sql`EXCLUDED.icon`,
                  user_id: sql`EXCLUDED.user_id`
                }
              });
          }

          // Restore bills
          if (processedData.bills.length > 0) {
            console.log('Restoring bills...');
            await tx.insert(bills).values(processedData.bills)
              .onConflictDoUpdate({
                target: [bills.id],
                set: {
                  name: sql`EXCLUDED.name`,
                  amount: sql`EXCLUDED.amount`,
                  day: sql`EXCLUDED.day`,
                  category_id: sql`EXCLUDED.category_id`,
                  user_id: sql`EXCLUDED.user_id`
                }
              });
          }

          // Restore transactions
          if (processedData.transactions.length > 0) {
            console.log('Restoring transactions...');
            await tx.insert(transactions).values(processedData.transactions)
              .onConflictDoUpdate({
                target: [transactions.id],
                set: {
                  description: sql`EXCLUDED.description`,
                  amount: sql`EXCLUDED.amount`,
                  date: sql`EXCLUDED.date`,
                  type: sql`EXCLUDED.type`,
                  category_id: sql`EXCLUDED.category_id`,
                  user_id: sql`EXCLUDED.user_id`
                }
              });
          }
        });

        console.log('Database restore completed successfully');

        res.json({ 
          message: 'Backup restored successfully',
          summary: {
            categories: processedData.categories.length,
            bills: processedData.bills.length,
            transactions: processedData.transactions.length
          }
        });
      } catch (parseError: any) {
        console.error('Error processing backup data:', parseError);
        res.status(400).json({ 
          error: 'Invalid backup file content',
          details: parseError.message || 'Unknown parse error'
        });
      }
    } finally {
      // Clean up the temporary file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        console.log('Temporary file cleaned up');
      }
    }
  } catch (error: any) {
    console.error('Error in restore endpoint:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      });
    }
  }
});

export default router;