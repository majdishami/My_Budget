import { db } from '@db';
import path from 'path';
import fs from 'fs';
import { sql } from 'drizzle-orm';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function generateDatabaseBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(process.cwd(), 'tmp');
    const backupFile = path.join(backupPath, `budget_tracker_${timestamp}.dump`);

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
        const query = sql.raw(`SELECT * FROM ${tablename}`);
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
  try {
    // Verify backup file exists
    if (!fs.existsSync(backupFile)) {
      throw new Error('Backup file not found');
    }

    const fileExtension = path.extname(backupFile).toLowerCase();
    console.log('Attempting to restore from file:', backupFile);
    console.log('File extension:', fileExtension);

    if (fileExtension === '.dump') {
      // Handle PostgreSQL dump file restore
      try {
        const { DATABASE_URL } = process.env;
        if (!DATABASE_URL) {
          throw new Error('DATABASE_URL environment variable is not set');
        }

        console.log('Restoring from dump file using pg_restore');

        // Drop all existing tables
        const dropTablesResult = await db.execute(sql`
          DO $$ DECLARE
            r RECORD;
          BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
              EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
          END $$;
        `);
        console.log('Dropped existing tables');

        // Use pg_restore to restore the dump file
        const restoreCommand = `pg_restore --clean --if-exists --no-owner --no-privileges --no-comments -d "${DATABASE_URL}" "${backupFile}"`;
        console.log('Executing restore command...');
        const { stdout, stderr } = await execAsync(restoreCommand);

        if (stderr) {
          console.log('pg_restore stderr:', stderr);
        }
        console.log('pg_restore stdout:', stdout);

        return {
          success: true,
          message: 'Database restored successfully from dump file'
        };
      } catch (error) {
        console.error('Error during pg_restore:', error);
        throw new Error(`Failed to restore from dump file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (fileExtension === '.json') {
      // Handle JSON backup restore
      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
      console.log('Reading backup file:', backupFile);

      // Get all table names from the database
      const result = await db.execute(sql`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `);
      const tables = Array.isArray(result) ? result : result.rows || [];

      // Restore each table
      for (const row of tables) {
        const tablename = row.tablename;
        if (backupData[tablename]) {
          try {
            console.log(`Restoring table: ${tablename}`);

            // Clear existing data
            await db.execute(sql.raw(`TRUNCATE TABLE ${tablename} CASCADE`));

            // Insert backup data if there are rows to restore
            if (backupData[tablename].length > 0) {
              const columns = Object.keys(backupData[tablename][0]).join(', ');

              for (const record of backupData[tablename]) {
                const values = Object.values(record)
                  .map(val => typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val)
                  .join(', ');

                await db.execute(sql.raw(
                  `INSERT INTO ${tablename} (${columns}) VALUES (${values})`
                ));
              }
            }

            console.log(`Restored ${backupData[tablename].length} records to ${tablename}`);
          } catch (tableError: any) {
            console.error(`Error restoring table ${tablename}:`, tableError);
            throw new Error(`Failed to restore table ${tablename}: ${tableError.message}`);
          }
        }
      }

      return {
        success: true,
        message: 'Database restored successfully from JSON'
      };
    } else {
      throw new Error('Unsupported file format. Please use .dump or .json files');
    }
  } catch (error) {
    console.error('Error restoring database backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}