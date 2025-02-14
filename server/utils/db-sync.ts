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

  // Start a transaction for the entire restore process
  return db.transaction(async (tx) => {
    try {
      console.log('Reading backup file:', backupFile);

      // Verify backup file exists
      if (!fs.existsSync(backupFile)) {
        throw new Error('Backup file not found');
      }

      // Read and parse backup file
      let backupData: Record<string, any[]>;
      try {
        const backupContent = fs.readFileSync(backupFile, 'utf-8');
        console.log('Backup file content length:', backupContent.length);
        console.log('Sample of backup content:', backupContent.substring(0, 200));
        backupData = JSON.parse(backupContent);
        console.log('Successfully parsed backup data. Tables found:', Object.keys(backupData));
      } catch (parseError) {
        console.error('Error parsing backup file:', parseError);
        throw new Error(`Invalid JSON format in backup file: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
      }

      // Validate backup data structure
      if (!backupData || typeof backupData !== 'object' || Object.keys(backupData).length === 0) {
        throw new Error('Invalid backup file structure');
      }

      // Process tables in a specific order to handle foreign key constraints
      const tableOrder = ['categories', 'transactions', 'bills'];

      for (const tablename of tableOrder) {
        if (!backupData[tablename]) {
          console.log(`No data found for table ${tablename} in backup`);
          continue;
        }

        console.log(`Processing table ${tablename}, ${backupData[tablename].length} records found`);

        try {
          // Clear existing data
          await tx.execute(sql.raw(`TRUNCATE TABLE "${tablename}" RESTART IDENTITY CASCADE`));
          console.log(`Cleared existing data from ${tablename}`);

          if (backupData[tablename].length > 0) {
            // Get column information
            const columnsResult = await tx.execute(sql`
              SELECT column_name, data_type, column_default 
              FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = ${tablename}
              ORDER BY ordinal_position
            `);

            const columns = (Array.isArray(columnsResult) ? columnsResult : columnsResult.rows || [])
              .filter(col => !col.column_default?.includes('nextval')) // Exclude auto-increment columns
              .map(col => ({
                name: col.column_name,
                type: col.data_type
              }));

            console.log(`Table ${tablename} columns:`, columns.map(c => c.name));

            // Insert records in batches
            const batchSize = 100;
            for (let i = 0; i < backupData[tablename].length; i += batchSize) {
              const batch = backupData[tablename].slice(i, i + batchSize);

              const columnNames = columns.map(col => `"${col.name}"`).join(', ');
              const values = batch.map(record => {
                const rowValues = columns.map(col => {
                  const value = record[col.name];
                  if (value === null || value === undefined) return 'NULL';

                  switch (col.type) {
                    case 'integer':
                    case 'numeric':
                    case 'bigint':
                      return value;
                    case 'timestamp without time zone':
                    case 'timestamp with time zone':
                      return value ? `'${value}'::timestamp` : 'NULL';
                    case 'boolean':
                      return value ? 'true' : 'false';
                    default:
                      return `'${String(value).replace(/'/g, "''")}'`;
                  }
                });
                return `(${rowValues.join(', ')})`;
              }).join(',\n');

              if (values) {
                const insertQuery = sql.raw(
                  `INSERT INTO "${tablename}" (${columnNames}) VALUES ${values}`
                );
                await tx.execute(insertQuery);
                console.log(`Inserted batch of ${batch.length} records into ${tablename}`);
              }
            }

            // Reset sequences if they exist
            const sequenceResult = await tx.execute(sql`
              SELECT column_name, column_default
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = ${tablename}
                AND column_default LIKE 'nextval%'
            `);

            const sequences = (Array.isArray(sequenceResult) ? sequenceResult : sequenceResult.rows || []);
            for (const seq of sequences) {
              const sequenceName = seq.column_default.match(/nextval\('([^']+)'/)?.[1];
              if (sequenceName) {
                await tx.execute(sql.raw(`
                  SELECT setval('${sequenceName}', COALESCE((SELECT MAX(${seq.column_name}) FROM "${tablename}"), 1))
                `));
                console.log(`Reset sequence ${sequenceName} for ${tablename}`);
              }
            }
          }
        } catch (error) {
          console.error(`Error restoring table ${tablename}:`, error);
          throw new Error(`Failed to restore table ${tablename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log('Database restore completed successfully');
      return {
        success: true,
        message: 'Database restored successfully'
      };
    } catch (error) {
      console.error('Error in restore process:', error);
      throw error;
    }
  }).catch(error => {
    console.error('Transaction failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  });
}