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
      if (!fs.existsSync(backupFile)) {
        throw new Error('Backup file not found');
      }

      console.log('Reading backup file:', backupFile);
      const backupContent = fs.readFileSync(backupFile, 'utf-8');
      console.log('Backup content length:', backupContent.length);

      let backupData: Record<string, any[]>;

      try {
        backupData = JSON.parse(backupContent);
        console.log('Data parsed successfully, validating structure...');

        if (!backupData.categories || !Array.isArray(backupData.categories)) {
          throw new Error('Invalid backup structure: missing categories array');
        }

        if (!backupData.bills || !Array.isArray(backupData.bills)) {
          throw new Error('Invalid backup structure: missing bills array');
        }

        console.log(`Found ${backupData.categories.length} categories and ${backupData.bills.length} bills`);
      } catch (parseError) {
        console.error('Error parsing backup data:', parseError);
        throw new Error(`Invalid backup file format: ${parseError instanceof Error ? parseError.message : 'Parse error'}`);
      }

      // Reset sequences
      await tx.execute(sql`ALTER SEQUENCE categories_id_seq RESTART WITH 1`);
      await tx.execute(sql`ALTER SEQUENCE bills_id_seq RESTART WITH 1`);
      console.log('Reset sequences');

      // Process categories first
      if (backupData.categories?.length > 0) {
        console.log(`Processing ${backupData.categories.length} categories`);

        // Clear existing data
        await tx.execute(sql`TRUNCATE TABLE categories RESTART IDENTITY CASCADE`);
        console.log('Cleared existing categories');

        // Map to store old category IDs to new ones
        const categoryIdMap = new Map<number, number>();

        // Insert categories and collect their new IDs
        for (const category of backupData.categories) {
          try {
            console.log('Inserting category:', category.name);
            const result = await tx.execute(sql`
              INSERT INTO categories (name, color, icon, user_id, created_at)
              VALUES (
                ${category.name},
                ${category.color},
                ${category.icon || null},
                ${category.user_id || null},
                ${category.created_at}::timestamp
              )
              RETURNING id
            `);

            const newId = Array.isArray(result) && result[0]?.id
              ? result[0].id
              : result.rows?.[0]?.id;

            if (typeof newId !== 'number') {
              throw new Error(`Failed to get new ID for category ${category.id}`);
            }

            categoryIdMap.set(category.id, newId);
            console.log(`Mapped category ${category.id} to ${newId}`);
          } catch (insertError) {
            console.error('Error inserting category:', category, insertError);
            throw insertError;
          }
        }

        // Process bills next
        if (backupData.bills?.length > 0) {
          console.log(`Processing ${backupData.bills.length} bills`);

          // Clear existing bills
          await tx.execute(sql`TRUNCATE TABLE bills RESTART IDENTITY`);
          console.log('Cleared existing bills');

          // Insert bills with mapped category IDs
          for (const bill of backupData.bills) {
            const newCategoryId = categoryIdMap.get(bill.category_id);
            if (typeof newCategoryId !== 'number') {
              console.log(`Skipping bill with invalid category_id: ${bill.category_id}`);
              continue;
            }

            try {
              console.log('Inserting bill:', bill.name);
              await tx.execute(sql`
                INSERT INTO bills (name, amount, day, category_id, user_id, created_at)
                VALUES (
                  ${bill.name},
                  ${bill.amount}::numeric,
                  ${bill.day},
                  ${newCategoryId},
                  ${bill.user_id || null},
                  ${bill.created_at}::timestamp
                )
              `);
            } catch (insertError) {
              console.error('Error inserting bill:', bill, insertError);
              throw insertError;
            }
          }
        }

        // Update sequences
        await tx.execute(sql`
          SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM categories))
        `);
        await tx.execute(sql`
          SELECT setval('bills_id_seq', (SELECT COALESCE(MAX(id), 1) FROM bills))
        `);

        return {
          success: true,
          message: 'Database restored successfully'
        };
      } else {
        throw new Error('No categories found in backup file');
      }
    } catch (error) {
      console.error('Error in restore process:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  });
}