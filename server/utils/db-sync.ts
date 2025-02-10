import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { db } from '@db';

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

    // Generate backup using pg_dump
    const dumpCommand = `PGPASSWORD=${process.env.PGPASSWORD} pg_dump -h ${process.env.PGHOST} -U ${process.env.PGUSER} -d ${process.env.PGDATABASE} -F c -f ${backupFile}`;
    
    await execAsync(dumpCommand);
    
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
