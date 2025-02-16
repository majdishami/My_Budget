import { Router } from 'express';
import { generateDatabaseBackup, restoreDatabaseBackup } from '../utils/db-sync';
import path from 'path';
import fs from 'fs';
import type { UploadedFile } from 'express-fileupload';
import { db } from '@db';
import { bills, transactions, categories, users } from '@db/schema';
import { eq, sql } from 'drizzle-orm';

const router = Router();

// Helper function to validate backup data structure
const validateBackupData = (data: any) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup format: data must be an object');
  }

  const requiredArrays = ['categories', 'bills', 'transactions'];
  for (const arrayName of requiredArrays) {
    if (!Array.isArray(data[arrayName])) {
      throw new Error(`Invalid backup format: missing or invalid ${arrayName} array`);
    }
  }

  // Validate data relationships
  for (const transaction of data.transactions) {
    if (transaction.category_id && !data.categories.some(cat => cat.id === transaction.category_id)) {
      throw new Error(`Invalid category reference in transaction: ${transaction.id}`);
    }
  }

  for (const bill of data.bills) {
    if (bill.category_id && !data.categories.some(cat => cat.id === bill.category_id)) {
      throw new Error(`Invalid category reference in bill: ${bill.id}`);
    }
  }

  return true;
};

router.post('/api/sync/backup', async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await generateDatabaseBackup(req.session.userId);

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
    // Ensure user is authenticated
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

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

      // Read and validate file content
      const fileContent = fs.readFileSync(tempPath, 'utf8');
      console.log('File content length:', fileContent.length);

      try {
        // Parse and validate the JSON content
        const parsedData = JSON.parse(fileContent);
        console.log('Data parsed successfully, validating structure...');

        // Validate backup structure
        validateBackupData(parsedData);

        // Get current user data
        const user = await db.query.users.findFirst({
          where: eq(users.id, req.session.userId)
        });

        if (!user) {
          throw new Error('User not found');
        }

        // Start transaction for atomic restore
        await db.transaction(async (tx) => {
          // Update categories to associate with current user
          const categoryData = parsedData.categories.map((cat: any) => ({
            ...cat,
            user_id: user.id
          }));

          // Restore categories first (if any new ones)
          if (categoryData.length > 0) {
            await tx.insert(categories).values(categoryData)
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

          // Update bills to associate with current user
          const billData = parsedData.bills.map((bill: any) => ({
            ...bill,
            user_id: user.id
          }));

          // Restore bills
          if (billData.length > 0) {
            await tx.insert(bills).values(billData)
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

          // Update transactions to associate with current user
          const transactionData = parsedData.transactions.map((trans: any) => ({
            ...trans,
            user_id: user.id
          }));

          // Restore transactions
          if (transactionData.length > 0) {
            await tx.insert(transactions).values(transactionData)
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