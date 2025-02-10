import { db } from '@db';
import path from 'path';
import fs from 'fs';
import { sql } from 'drizzle-orm';

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
        const data = await db.execute(sql`
          SELECT * FROM "${tablename}"
        `);
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