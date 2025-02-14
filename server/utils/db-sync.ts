import { db } from '@db';
import path from 'path';
import fs from 'fs';
import { sql } from 'drizzle-orm';

export async function generateDatabaseBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(process.cwd(), 'tmp');
    const backupFile = path.join(backupPath, `budget_tracker_${timestamp}.json`);

    // Ensure tmp directory exists
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    // Get all table names in the database
    const result = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    // Create a backup object with table data
    const backup: Record<string, any> = {};
    const tables = Array.isArray(result) ? result : result.rows || [];

    console.log('Found tables:', tables);

    // For each table, get all rows
    for (const row of tables) {
      const tablename = row.tablename;
      try {
        console.log(`Backing up table: ${tablename}`);
        const query = sql.raw(`SELECT * FROM "${tablename}"`);
        const data = await db.execute(query);
        backup[tablename] = Array.isArray(data) ? data : data.rows || [];
      } catch (tableError: any) {
        console.error(`Error backing up table ${tablename}:`, tableError);
        throw new Error(`Failed to backup table ${tablename}: ${tableError.message}`);
      }
    }

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

export async function restoreDatabaseBackup(backupFile: string) {
  console.log('Starting database restore process...');

  return db.transaction(async (tx) => {
    try {
      // Read and parse backup file
      if (!fs.existsSync(backupFile)) {
        throw new Error('Backup file not found');
      }

      const backupContent = fs.readFileSync(backupFile, 'utf-8');
      console.log('Reading backup file content...');

      let backupData: Record<string, any[]>;
      try {
        backupData = JSON.parse(backupContent);
      } catch (parseError) {
        throw new Error(`Invalid backup file format: ${parseError instanceof Error ? parseError.message : 'Parse error'}`);
      }

      // Reset all sequences first
      const sequences = ['categories_id_seq', 'bills_id_seq'];
      for (const seq of sequences) {
        await tx.execute(sql.raw(`ALTER SEQUENCE "${seq}" RESTART WITH 1`));
        console.log(`Reset sequence ${seq}`);
      }

      // Step 1: Restore categories and create ID mapping
      const categoryMap = new Map<number, number>(); // old ID -> new ID

      if (backupData.categories?.length > 0) {
        console.log('Restoring categories...');
        await tx.execute(sql.raw('TRUNCATE TABLE categories RESTART IDENTITY CASCADE'));

        for (const category of backupData.categories) {
          const oldId = category.id;
          const result = await tx.execute(sql.raw(`
            INSERT INTO categories (name, color, icon, user_id, created_at)
            VALUES (
              '${category.name.replace(/'/g, "''")}',
              '${category.color.replace(/'/g, "''")}',
              '${category.icon.replace(/'/g, "''")}',
              ${category.user_id === null ? 'NULL' : category.user_id},
              '${category.created_at}'::timestamp
            )
            RETURNING id
          `));

          const newId = result[0].id;
          categoryMap.set(oldId, newId);
          console.log(`Mapped category ID ${oldId} -> ${newId}`);
        }

        // Step 2: Restore bills with updated category IDs
        if (backupData.bills?.length > 0) {
          console.log('Restoring bills...');
          await tx.execute(sql.raw('TRUNCATE TABLE bills RESTART IDENTITY'));

          for (const bill of backupData.bills) {
            const newCategoryId = categoryMap.get(bill.category_id);
            if (!newCategoryId) {
              console.log(`Skipping bill with invalid category_id: ${bill.category_id}`);
              continue;
            }

            await tx.execute(sql.raw(`
              INSERT INTO bills (name, amount, day, category_id, user_id, created_at)
              VALUES (
                '${bill.name.replace(/'/g, "''")}',
                ${bill.amount},
                ${bill.day},
                ${newCategoryId},
                ${bill.user_id === null ? 'NULL' : bill.user_id},
                '${bill.created_at}'::timestamp
              )
            `));
          }
        }

        // Update sequences
        await tx.execute(sql.raw("SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM categories))"));
        await tx.execute(sql.raw("SELECT setval('bills_id_seq', (SELECT COALESCE(MAX(id), 1) FROM bills))"));
      }

      return {
        success: true,
        message: 'Database restored successfully'
      };
    } catch (error) {
      console.error('Error in restore process:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  });
}