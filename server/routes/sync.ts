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
    const categoriesArray = Object.entries(data.categories || {}).map(([name, category]: [string, any]) => ({
      id: category.id,
      name,
      color: category.color || '#808080',
      icon: category.icon || 'circle'
    }));

    const categoryMap = new Map(categoriesArray.map(cat => [cat.name, cat]));
    const missingCategories: string[] = [];

    const billsArray = Object.entries(data.bills || {}).map(([id, bill]: [string, any]) => {
      const amount = typeof bill.amount === 'string' ? parseFloat(bill.amount) : bill.amount;
      const category = categoryMap.get(bill.category);

      if (!category) {
        missingCategories.push(bill.category);
        return null;
      }

      return {
        id: parseInt(id),
        name: bill.name,
        amount,
        day: bill.day,
        category_id: category.id,
        is_one_time: bill.is_one_time || false,
        is_yearly: bill.is_yearly || false,
        date: bill.date ? new Date(bill.date) : null,
        yearly_date: bill.yearly_date ? new Date(bill.yearly_date) : null,
        reminder_enabled: bill.reminder_enabled || false,
        reminder_days: bill.reminder_days || 7
      };
    }).filter(Boolean);

    const transactionsArray = (data.transactions || []).map((t: any) => {
      const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
      const date = new Date(t.date);

      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date for transaction "${t.description}"`);
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

    const summary = {
      categories: categoriesArray.length,
      bills: billsArray.length,
      transactions: transactionsArray.length,
      warnings: missingCategories.length > 0 ? 
        `Missing categories for bills: ${missingCategories.join(', ')}` : undefined
    };
    console.log('Data validation completed:', summary);

    return {
      categories: categoriesArray,
      bills: billsArray,
      transactions: transactionsArray
    };
  } catch (error) {
    console.error('Data validation error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};

router.post('/api/sync/backup', async (req, res) => {
  try {
    const result = await generateDatabaseBackup();

    if (!result.success || !result.fileName) {
      return res.status(500).json({ error: result.error || 'Failed to generate backup' });
    }

    const backupData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tmp', result.fileName), 'utf8'));
    const transformedData = {
      categories: backupData.categories.reduce((acc: any, category: any) => {
        acc[category.name] = {
          id: category.id,
          color: category.color || '#808080',
          icon: category.icon || 'circle'
        };
        return acc;
      }, {}),
      bills: backupData.bills.reduce((acc: any, bill: any) => {
        const category = backupData.categories.find((c: any) => c.id === bill.category_id);
        acc[bill.id] = {
          name: bill.name,
          amount: typeof bill.amount === 'string' ? parseFloat(bill.amount) : bill.amount,
          day: bill.day,
          category: category?.name || 'Other',
          is_one_time: bill.is_one_time || false,
          is_yearly: bill.is_yearly || false,
          date: bill.date,
          yearly_date: bill.yearly_date,
          reminder_enabled: bill.reminder_enabled || false,
          reminder_days: bill.reminder_days || 7
        };
        return acc;
      }, {}),
      transactions: backupData.transactions.map((t: any) => ({
        ...t,
        amount: typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
      }))
    };

    const outputPath = path.join(process.cwd(), 'tmp', result.fileName);
    fs.writeFileSync(outputPath, JSON.stringify(transformedData, null, 2));

    res.json({
      message: 'Backup generated successfully',
      downloadUrl: `/api/sync/download/${result.fileName}`
    });
  } catch (error) {
    console.error('Backup generation failed:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
  }
});

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
    tempPath = path.join(process.cwd(), 'tmp', `restore_${Date.now()}.json`);

    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    await uploadedFile.mv(tempPath);
    const fileContent = fs.readFileSync(tempPath, 'utf8');
    const processedData = validateAndPreprocessData(JSON.parse(fileContent));

    await db.transaction(async (tx: any) => {
      const restored = {
        categories: 0,
        bills: 0,
        transactions: 0
      };

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
        restored.categories++;
      }

      for (const bill of processedData.bills) {
        await tx.insert(bills).values(bill)
          .onConflictDoUpdate({
            target: [bills.id],
            set: {
              name: sql`EXCLUDED.name`,
              amount: sql`EXCLUDED.amount`,
              day: sql`EXCLUDED.day`,
              category_id: sql`EXCLUDED.category_id`,
              is_one_time: sql`EXCLUDED.is_one_time`,
              is_yearly: sql`EXCLUDED.is_yearly`,
              date: sql`EXCLUDED.date`,
              yearly_date: sql`EXCLUDED.yearly_date`,
              reminder_enabled: sql`EXCLUDED.reminder_enabled`,
              reminder_days: sql`EXCLUDED.reminder_days`
            }
          });
        restored.bills++;
      }

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
        restored.transactions++;
      }

      console.log('Backup restoration completed:', restored);
    });

    res.json({ 
      message: 'Backup restored successfully',
      summary: {
        categories: processedData.categories.length,
        bills: processedData.bills.length,
        transactions: processedData.transactions.length
      }
    });
  } catch (error: any) {
    console.error('Restore operation failed:', {
      error: error.message || 'Unknown error',
      phase: error.phase || 'unknown'
    });

    if (!res.headersSent) {
      res.status(500).json({ 
        error: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  } finally {
    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
});

export default router;