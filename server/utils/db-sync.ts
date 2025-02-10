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
  // Start a transaction for the entire restore process
  const transaction = db.transaction(async (tx) => {
    try {
      // Verify backup file exists
      if (!fs.existsSync(backupFile)) {
        throw new Error('Backup file not found');
      }

      // Verify it's a JSON file
      if (!backupFile.toLowerCase().endsWith('.json')) {
        throw new Error('Invalid backup file format. Please use a .json backup file');
      }

      // Read and parse backup file
      const backupContent = fs.readFileSync(backupFile, 'utf-8');
      let backupData: Record<string, any[]>;

      try {
        backupData = JSON.parse(backupContent);
      } catch (parseError) {
        throw new Error(`Invalid JSON format in backup file: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
      }

      // Validate backup data structure
      if (typeof backupData !== 'object' || backupData === null || Object.keys(backupData).length === 0) {
        throw new Error('Invalid backup file structure: missing table data');
      }

      // Get existing tables from the database
      const result = await tx.execute(sql`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `);
      const tables = (Array.isArray(result) ? result : result.rows || [])
        .map(row => row.tablename);

      console.log('Existing tables:', tables);

      // Restore each table
      for (const tablename of tables) {
        if (backupData[tablename]) {
          try {
            console.log(`Restoring table: ${tablename}`);

            // Clear existing data
            await tx.execute(sql.raw(`TRUNCATE TABLE "${tablename}" CASCADE`));

            // Get table columns
            const columnsResult = await tx.execute(sql`
              SELECT column_name, data_type
              FROM information_schema.columns
              WHERE table_schema = 'public'
              AND table_name = ${tablename}
            `);

            const columns = (Array.isArray(columnsResult) ? columnsResult : columnsResult.rows || [])
              .map(col => col.column_name);

            console.log(`Columns for ${tablename}:`, columns);

            // Insert backup data if there are rows to restore
            if (Array.isArray(backupData[tablename]) && backupData[tablename].length > 0) {
              for (const record of backupData[tablename]) {
                // Filter record to only include existing columns
                const filteredRecord: Record<string, any> = {};
                for (const col of columns) {
                  if (record.hasOwnProperty(col)) {
                    filteredRecord[col] = record[col];
                  }
                }

                const columnsList = Object.keys(filteredRecord).join('", "');
                const values = Object.values(filteredRecord)
                  .map(val => {
                    if (val === null) return 'NULL';
                    return typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
                  })
                  .join(', ');

                const insertQuery = sql.raw(
                  `INSERT INTO "${tablename}" ("${columnsList}") VALUES (${values})`
                );
                await tx.execute(insertQuery);
              }
            }

            console.log(`Restored ${backupData[tablename].length} records to ${tablename}`);
          } catch (tableError: any) {
            console.error(`Error restoring table ${tablename}:`, tableError);
            throw new Error(`Failed to restore table ${tablename}: ${tableError.message}`);
          }
        } else {
          console.log(`Skipping table ${tablename}: no data in backup`);
        }
      }

      return {
        success: true,
        message: 'Database restored successfully'
      };
    } catch (error) {
      console.error('Error in restore transaction:', error);
      throw error; // Re-throw to trigger rollback
    }
  });

  try {
    return await transaction;
  } catch (error) {
    console.error('Error restoring database backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}