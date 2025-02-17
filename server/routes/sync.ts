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

    // Transform categories from dictionary to array format for database operations
    const categoriesArray = Object.entries(data.categories || {}).map(([name, category]: [string, any]) => ({
      id: category.id,
      name,
      color: category.color || '#808080',
      icon: category.icon || 'circle',
      user_id: 1 // Default user
    }));

    // Create a map for quick category lookups
    const categoryMap = new Map(categoriesArray.map(cat => [cat.name, cat]));

    // Transform bills from dictionary to array format
    const billsArray = Object.entries(data.bills || {}).map(([id, bill]: [string, any]) => {
      const amount = typeof bill.amount === 'string' ? parseFloat(bill.amount) : bill.amount;
      if (isNaN(amount)) {
        throw new Error(`Invalid amount format for bill "${bill.name}": amount must be a valid number`);
      }

      const category = categoryMap.get(bill.category);
      if (!category) {
        throw new Error(`Invalid category "${bill.category}" for bill "${bill.name}"`);
      }

      return {
        id: parseInt(id),
        name: bill.name,
        amount,
        day: bill.day,
        category_id: category.id,
        user_id: bill.user_id || 1
      };
    });

    return {
      users: data.users || [],
      categories: categoriesArray,
      bills: billsArray,
      transactions: (data.transactions || []).map((t: any) => ({
        ...t,
        amount: typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
      }))
    };
  } catch (error) {
    console.error('Data validation error:', error);
    throw error;
  }
};

// Backup endpoint - Format data in the new schema structure
router.post('/api/sync/backup', async (req, res) => {
  try {
    const result = await generateDatabaseBackup();

    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to generate backup' 
      });
    }

    const backupData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tmp', result.fileName), 'utf8'));

    // Transform categories to dictionary with name as key
    const categoriesDict = backupData.categories.reduce((acc: any, category: any) => {
      acc[category.name] = {
        id: category.id,
        color: category.color,
        icon: category.icon || 'circle'
      };
      return acc;
    }, {});

    // Transform bills to dictionary with ID as key
    const billsDict = backupData.bills.reduce((acc: any, bill: any) => {
      const category = backupData.categories.find((c: any) => c.id === bill.category_id);
      acc[bill.id] = {
        name: bill.name,
        amount: typeof bill.amount === 'string' ? parseFloat(bill.amount) : bill.amount,
        day: bill.day,
        category: category?.name || 'Other',
        user_id: bill.user_id
      };
      return acc;
    }, {});

    // Structure the data according to the new schema
    const transformedData = {
      users: backupData.users || [],
      categories: categoriesDict,
      bills: billsDict,
      transactions: backupData.transactions.map((t: any) => ({
        ...t,
        amount: typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
      }))
    };

    // Write transformed data back to file
    fs.writeFileSync(
      path.join(process.cwd(), 'tmp', result.fileName), 
      JSON.stringify(transformedData, null, 2)
    );

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

// Restore endpoint - Handle the new schema structure
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
        // Restore categories first
        if (processedData.categories.length > 0) {
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