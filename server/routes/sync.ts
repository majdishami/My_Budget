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

    // Convert bills from object to array if needed
    if (typeof data.bills === 'object' && !Array.isArray(data.bills)) {
      data.bills = Object.entries(data.bills).map(([id, bill]: [string, any]) => ({
        ...bill,
        id: parseInt(id)
      }));
    } else if (!Array.isArray(data.bills)) {
      throw new Error('Invalid backup format: "bills" must be an object or array');
    }

    // Create a set of category IDs for reference
    const categoryIds = new Set(data.categories.map((cat: any) => cat.id));

    // Process and validate bills
    const processedBills = data.bills.map((bill: any) => {
      if (!bill.id || !bill.name || !bill.amount || typeof bill.day !== 'number') {
        throw new Error(`Invalid bill format: Each bill must have id, name, amount, and day fields`);
      }

      // Convert amount to numeric if it's a string
      const amount = typeof bill.amount === 'string' ? parseFloat(bill.amount) : bill.amount;

      // Remove created_at if present to let DB handle it
      const { created_at, category, ...rest } = bill;

      // If category name is provided instead of ID, look up the ID
      if (category && !rest.category_id) {
        const categoryEntry = data.categories.find((cat: any) => cat.name === category);
        if (categoryEntry) {
          rest.category_id = categoryEntry.id;
        } else {
          console.warn(`Warning: Bill "${rest.name}" references non-existent category ${category}`);
          rest.category_id = 17; // Default to General Expenses
        }
      }

      return {
        ...rest,
        amount,
        day: parseInt(rest.day.toString())
      };
    });

    // Convert processed bills back to dictionary format
    data.bills = processedBills.reduce((acc: any, bill: any) => {
      acc[bill.id] = bill;
      return acc;
    }, {});

    return data;
  } catch (error) {
    console.error('Data validation error:', error);
    throw error;
  }
};

// Backup endpoint - Format data as dictionary
router.post('/api/sync/backup', async (req, res) => {
  try {
    const result = await generateDatabaseBackup();

    if (!result.success) {
      console.error('Backup generation failed:', result.error);
      return res.status(500).json({ 
        error: result.error || 'Failed to generate backup' 
      });
    }

    // Transform bills array to dictionary before sending
    const backupData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tmp', result.fileName), 'utf8'));
    backupData.bills = backupData.bills.reduce((acc: any, bill: any) => {
      acc[bill.id] = bill;
      return acc;
    }, {});

    // Write transformed data back to file
    fs.writeFileSync(path.join(process.cwd(), 'tmp', result.fileName), JSON.stringify(backupData, null, 2));

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

// Download endpoint remains unchanged
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

// Restore endpoint - Handle both dictionary and array formats
router.post('/api/sync/restore', async (req, res) => {
  let tempPath = '';

  try {
    if (!req.files?.backup || Array.isArray(req.files.backup)) {
      return res.status(400).json({ error: 'No backup file provided' });
    }

    const uploadedFile = req.files.backup as UploadedFile;
    tempPath = path.join(process.cwd(), 'tmp', `restore_${Date.now()}.json`);

    // Create tmp directory if it doesn't exist
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    await uploadedFile.mv(tempPath);
    const fileContent = fs.readFileSync(tempPath, 'utf8');

    try {
      const parsedData = JSON.parse(fileContent);
      const processedData = validateAndPreprocessData(parsedData);

      await db.transaction(async (tx) => {
        // Convert bills back to array for database insertion
        const billsArray = Object.values(processedData.bills);

        if (billsArray.length > 0) {
          console.log('Restoring bills...');
          await tx.insert(bills).values(billsArray)
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

      res.json({ 
        message: 'Backup restored successfully',
        summary: {
          categories: processedData.categories.length,
          bills: Object.keys(processedData.bills).length,
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
  } catch (error: any) {
    console.error('Error in restore endpoint:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      });
    }
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
});

export default router;