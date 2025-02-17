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
    console.log('Starting data validation...');

    // Convert categories from object to array
    const categoriesArray = Object.entries(data.categories || {}).map(([name, category]: [string, any]) => ({
      id: category.id,
      name,
      color: category.color || '#808080',
      icon: category.icon || 'circle'
    }));

    // Create a map for category lookups
    const categoryMap = new Map(categoriesArray.map(cat => [cat.name, cat]));

    // Convert bills from object to array
    const billsArray = Object.entries(data.bills || {}).map(([id, bill]: [string, any]) => {
      const amount = typeof bill.amount === 'string' ? parseFloat(bill.amount) : bill.amount;
      const category = categoryMap.get(bill.category);

      if (!category) {
        console.warn(`Warning: Category "${bill.category}" not found for bill "${bill.name}"`);
        return null;
      }

      return {
        id: parseInt(id),
        name: bill.name,
        amount,
        day: bill.day,
        category_id: category.id
      };
    }).filter(Boolean);

    // Process transactions
    const transactionsArray = (data.transactions || []).map((t: any) => {
      const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;

      // Handle date explicitly
      let date;
      try {
        date = new Date(t.date);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (e) {
        console.warn(`Warning: Invalid date for transaction "${t.description}", using current date`);
        date = new Date();
      }

      return {
        id: t.id,
        description: t.description,
        amount,
        date: date.toISOString(),
        type: t.type,
        category_id: t.category_id
      };
    });

    const processedData = {
      categories: categoriesArray,
      bills: billsArray,
      transactions: transactionsArray
    };

    console.log('Data validation completed successfully');
    return processedData;
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
      return res.status(500).json({ 
        error: result.error || 'Failed to generate backup' 
      });
    }

    const backupData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tmp', result.fileName), 'utf8'));

    // Transform categories to dictionary
    const categoriesDict = backupData.categories.reduce((acc: any, category: any) => {
      acc[category.name] = {
        id: category.id,
        color: category.color || '#808080',
        icon: category.icon || 'circle'
      };
      return acc;
    }, {});

    // Transform bills to dictionary
    const billsDict = backupData.bills.reduce((acc: any, bill: any) => {
      const category = backupData.categories.find((c: any) => c.id === bill.category_id);
      acc[bill.id] = {
        name: bill.name,
        amount: typeof bill.amount === 'string' ? parseFloat(bill.amount) : bill.amount,
        day: bill.day,
        category: category?.name || 'Other'
      };
      return acc;
    }, {});

    const transformedData = {
      categories: categoriesDict,
      bills: billsDict,
      transactions: backupData.transactions.map((t: any) => ({
        ...t,
        amount: typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
      }))
    };

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

// Download endpoint
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

// Restore endpoint
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

    try {
      const fileContent = fs.readFileSync(tempPath, 'utf8');
      console.log('Processing backup file...');

      const parsedData = JSON.parse(fileContent);
      const processedData = validateAndPreprocessData(parsedData);

      await db.transaction(async (tx) => {
        // Insert categories
        console.log('Restoring categories...');
        for (const category of processedData.categories) {
          await tx.insert(categories).values(category)
            .onConflictDoUpdate({
              target: [categories.id],
              set: {
                name: sql`EXCLUDED.name`,
                color: sql`EXCLUDED.color`,
                icon: sql`EXCLUDED.icon`
              }
            });
        }

        // Insert bills
        console.log('Restoring bills...');
        for (const bill of processedData.bills) {
          await tx.insert(bills).values(bill)
            .onConflictDoUpdate({
              target: [bills.id],
              set: {
                name: sql`EXCLUDED.name`,
                amount: sql`EXCLUDED.amount`,
                day: sql`EXCLUDED.day`,
                category_id: sql`EXCLUDED.category_id`
              }
            });
        }

        // Insert transactions
        console.log('Restoring transactions...');
        for (const transaction of processedData.transactions) {
          await tx.insert(transactions).values({
            ...transaction,
            date: new Date(transaction.date)
          })
            .onConflictDoUpdate({
              target: [transactions.id],
              set: {
                description: sql`EXCLUDED.description`,
                amount: sql`EXCLUDED.amount`,
                date: sql`EXCLUDED.date`,
                type: sql`EXCLUDED.type`,
                category_id: sql`EXCLUDED.category_id`
              }
            });
        }
      });

      console.log('Backup restored successfully');
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
        details: parseError.message,
        stack: parseError.stack
      });
    }
  } catch (error: any) {
    console.error('Error in restore endpoint:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error.message || 'Unknown error occurred',
        details: error.stack
      });
    }
  } finally {
    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
});

export default router;