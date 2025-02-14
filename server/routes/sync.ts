import { Router } from 'express';
import { generateDatabaseBackup, restoreDatabaseBackup } from '../utils/db-sync';
import path from 'path';
import fs from 'fs';
import type { UploadedFile } from 'express-fileupload';
import { db } from '@db';
import { bills, transactions, categories } from '@db/schema';

const router = Router();

router.post('/api/sync/backup', async (req, res) => {
  try {
    const result = await generateDatabaseBackup();

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
        if (!Array.isArray(parsedData.categories)) {
          throw new Error('Invalid backup format: missing or invalid categories array');
        }

        if (!Array.isArray(parsedData.bills)) {
          throw new Error('Invalid backup format: missing or invalid bills array');
        }

        if (!Array.isArray(parsedData.transactions)) {
          throw new Error('Invalid backup format: missing or invalid transactions array');
        }

        console.log(`Found ${parsedData.categories.length} categories, ${parsedData.bills.length} bills, and ${parsedData.transactions.length} transactions`);

        // Start transaction for atomic restore
        await db.transaction(async (tx) => {
          // Restore categories first (if any new ones)
          if (parsedData.categories.length > 0) {
            await tx.insert(categories).values(parsedData.categories)
              .onConflictDoNothing();
          }

          // Restore bills
          if (parsedData.bills.length > 0) {
            await tx.insert(bills).values(parsedData.bills)
              .onConflictDoNothing();
          }

          // Restore transactions
          if (parsedData.transactions.length > 0) {
            await tx.insert(transactions).values(parsedData.transactions)
              .onConflictDoNothing();
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
          error: 'Invalid JSON file content',
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