import { db } from '@db';
import path from 'path';
import fs from 'fs';
import { sql } from 'drizzle-orm';
import { categories, bills, transactions } from '@db/schema';

export async function generateDatabaseBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(process.cwd(), 'tmp');
    const backupFile = path.join(backupPath, `budget_tracker_${timestamp}.json`);

    // Ensure tmp directory exists
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    // Get all data
    const allCategories = await db.select().from(categories);
    const allBills = await db.select().from(bills);
    const allTransactions = await db.select().from(transactions);

    // Create backup object with data
    const backup = {
      categories: allCategories,
      bills: allBills,
      transactions: allTransactions,
      metadata: {
        version: '1.0',
        timestamp: new Date().toISOString()
      }
    };

    // Write the backup to a file
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`Backup created successfully at: ${backupFile}`);

    return {
      success: true,
      filePath: backupFile,
      fileName: path.basename(backupFile)
    };
  } catch (error) {
    console.error('Error generating database backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

interface BackupData {
  categories: any[];
  bills: any[];
  transactions: any[];
  metadata?: {
    version: string;
    timestamp: string;
  };
}

export async function validateBackupData(data: BackupData): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!data.categories || !Array.isArray(data.categories)) {
      return { valid: false, error: 'Missing or invalid categories array' };
    }

    if (!data.bills || !Array.isArray(data.bills)) {
      return { valid: false, error: 'Missing or invalid bills array' };
    }

    if (!data.transactions || !Array.isArray(data.transactions)) {
      return { valid: false, error: 'Missing or invalid transactions array' };
    }

    // Validate category references
    const categoryIds = new Set(data.categories.map(cat => cat.id));

    for (const bill of data.bills) {
      if (bill.category_id && !categoryIds.has(bill.category_id)) {
        return { valid: false, error: `Invalid category reference in bill: ${bill.id}` };
      }
    }

    for (const transaction of data.transactions) {
      if (transaction.category_id && !categoryIds.has(transaction.category_id)) {
        return { valid: false, error: `Invalid category reference in transaction: ${transaction.id}` };
      }
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}

export async function restoreDatabaseBackup(backupFile: string) {
  console.log('Starting database restore process...');

  try {
    if (!fs.existsSync(backupFile)) {
      throw new Error('Backup file not found');
    }

    console.log('Reading backup file:', backupFile);
    const backupContent = fs.readFileSync(backupFile, 'utf-8');
    const backupData: BackupData = JSON.parse(backupContent);

    // Validate backup data
    const validation = await validateBackupData(backupData);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Start transaction for atomic restore
    return await db.transaction(async (tx) => {
      try {
        // Restore categories first (if any new ones)
        if (backupData.categories.length > 0) {
          await tx.insert(categories).values(backupData.categories)
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
        if (backupData.bills.length > 0) {
          await tx.insert(bills).values(backupData.bills)
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
        if (backupData.transactions.length > 0) {
          await tx.insert(transactions).values(backupData.transactions)
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

        return {
          success: true,
          message: 'Database restored successfully',
          summary: {
            categories: backupData.categories.length,
            bills: backupData.bills.length,
            transactions: backupData.transactions.length
          }
        };
      } catch (error) {
        console.error('Error in restore process:', error);
        throw error;
      }
    });
  } catch (error) {
    console.error('Error in restore process:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}