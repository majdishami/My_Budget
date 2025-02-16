import { Router } from 'express';
import { generateDatabaseBackup, restoreDatabaseBackup } from '../utils/db-sync';
import path from 'path';
import fs from 'fs';
import type { UploadedFile } from 'express-fileupload';
import { db } from '@db';
import { bills, transactions, categories } from '@db/schema';
import { sql } from 'drizzle-orm';

const router = Router();

// Helper function to validate backup data structure with detailed error messages
const validateBackupData = (data: any) => {
  try {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid backup format: data must be a JSON object');
    }

    // Check required arrays exist
    const requiredArrays = ['categories', 'bills', 'transactions'];
    for (const arrayName of requiredArrays) {
      if (!Array.isArray(data[arrayName])) {
        throw new Error(`Invalid backup format: "${arrayName}" must be an array`);
      }
    }

    // Validate categories structure
    for (const category of data.categories) {
      if (!category.id || !category.name || !category.color || !category.icon) {
        throw new Error(`Invalid category format: Each category must have id, name, color, and icon fields`);
      }
    }

    // Create a set of category IDs for reference
    const categoryIds = new Set(data.categories.map((cat: any) => cat.id));

    // Validate bills structure and references
    for (const bill of data.bills) {
      if (!bill.id || !bill.name || !bill.amount || typeof bill.day !== 'number') {
        throw new Error(`Invalid bill format: Each bill must have id, name, amount, and day fields`);
      }
      if (bill.category_id && !categoryIds.has(bill.category_id)) {
        console.warn(`Warning: Bill "${bill.name}" references non-existent category ${bill.category_id}`);
      }
    }

    // Validate transactions structure and references
    for (const transaction of data.transactions) {
      if (!transaction.id || !transaction.description || !transaction.amount || !transaction.date) {
        throw new Error(`Invalid transaction format: Each transaction must have id, description, amount, and date fields`);
      }
      if (transaction.category_id && !categoryIds.has(transaction.category_id)) {
        console.warn(`Warning: Transaction "${transaction.description}" references non-existent category ${transaction.category_id}`);
      }
    }

    return true;
  } catch (error) {
    throw error;
  }
};

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
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    tempPath = path.join(tmpDir, `restore_${timestamp}.json`);

    try {
      // Move the uploaded file to tmp directory
      await uploadedFile.mv(tempPath);
      console.log('Backup file saved to:', tempPath);

      // Read and parse file content
      const fileContent = fs.readFileSync(tempPath, 'utf8');
      console.log('File content length:', fileContent.length);

      try {
        // Parse and validate the JSON content
        const parsedData = JSON.parse(fileContent);
        console.log('Data parsed successfully, validating structure...');

        // Validate backup structure
        validateBackupData(parsedData);

        // Start transaction for atomic restore
        await db.transaction(async (tx) => {
          // Restore categories first
          if (parsedData.categories.length > 0) {
            console.log('Restoring categories...');
            await tx.insert(categories).values(parsedData.categories)
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
          if (parsedData.bills.length > 0) {
            console.log('Restoring bills...');
            await tx.insert(bills).values(parsedData.bills)
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
          if (parsedData.transactions.length > 0) {
            console.log('Restoring transactions...');
            await tx.insert(transactions).values(parsedData.transactions)
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

        res.json({ 
          message: 'Backup restored successfully',
          summary: {
            categories: parsedData.categories.length,
            bills: parsedData.bills.length,
            transactions: parsedData.transactions.length
          }
        });
      } catch (parseError: any) {
        console.error('Error processing backup data:', parseError);
        res.status(400).json({ 
          error: 'Invalid backup file content',
          details: parseError.message || 'Unknown parse error'
        });
        return;
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