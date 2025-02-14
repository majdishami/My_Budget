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
        console.log('Tables in backup:', Object.keys(backupData));

        // Log sample records for debugging
        for (const table of Object.keys(backupData)) {
          console.log(`${table} sample:`, backupData[table].slice(0, 2));
        }
      } catch (parseError) {
        console.error('Error parsing backup file:', parseError);
        throw new Error(`Invalid JSON format in backup file: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
      }

      // First reset all sequences
      const sequencesResult = await tx.execute(sql`
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
      `);
      const sequences = (Array.isArray(sequencesResult) ? sequencesResult : sequencesResult.rows || []);

      for (const seq of sequences) {
        await tx.execute(sql.raw(`ALTER SEQUENCE "${seq.sequence_name}" RESTART WITH 1`));
        console.log(`Reset sequence ${seq.sequence_name}`);
      }

      // Process tables in correct order
      const tableOrder = ['categories', 'bills'];

      for (const tableName of tableOrder) {
        console.log(`\nProcessing table ${tableName}`);

        if (!backupData[tableName] || !Array.isArray(backupData[tableName])) {
          console.log(`No valid data found for table ${tableName}`);
          continue;
        }

        // Clear existing data
        await tx.execute(sql.raw(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`));
        console.log(`Cleared existing data from ${tableName}`);

        // Get columns for the table
        const columnsResult = await tx.execute(sql`
          SELECT column_name, data_type, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = ${tableName}
          ORDER BY ordinal_position
        `);

        const columns = (Array.isArray(columnsResult) ? columnsResult : columnsResult.rows || [])
          .filter(col => !col.column_default?.includes('nextval'))
          .map(col => ({
            name: col.column_name,
            type: col.data_type
          }));

        console.log(`Columns for ${tableName}:`, columns.map(c => c.name));

        // Process records
        const records = backupData[tableName].filter(record => {
          if (tableName === 'bills') {
            const categoryExists = backupData.categories?.some(cat => cat.id === record.category_id);
            if (!categoryExists) {
              console.log(`Skipping bill with missing category:`, record);
              return false;
            }
          }
          return true;
        });

        // Insert records in batches
        const batchSize = 50;
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);

          const columnsList = columns.map(c => `"${c.name}"`).join(', ');
          const values = batch.map(record => {
            const rowValues = columns.map(col => {
              const value = record[col.name];

              if (value === null || value === undefined) {
                return 'NULL';
              }

              switch (col.type) {
                case 'integer':
                case 'numeric':
                case 'bigint':
                  return value;
                case 'timestamp without time zone':
                case 'timestamp with time zone':
                  return `'${value}'::timestamp`;
                case 'boolean':
                  return value ? 'true' : 'false';
                default:
                  return `'${String(value).replace(/'/g, "''")}'`;
              }
            });
            return `(${rowValues.join(', ')})`;
          }).join(',\n');

          if (values) {
            const query = `INSERT INTO "${tableName}" (${columnsList}) VALUES ${values}`;
            await tx.execute(sql.raw(query));
            console.log(`Inserted ${batch.length} records into ${tableName}`);
          }
        }

        // Update sequence if exists
        const seqName = `${tableName}_id_seq`;
        try {
          await tx.execute(sql.raw(
            `SELECT setval('${seqName}', (SELECT COALESCE(MAX(id), 1) FROM "${tableName}"), true)`
          ));
          console.log(`Updated sequence for ${tableName}`);
        } catch (seqError) {
          console.log(`No sequence found for ${tableName}`);
        }
      }

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