import { Router } from 'express';
import { generateDatabaseBackup, restoreDatabaseBackup } from '../utils/db-sync';
import path from 'path';
import fs from 'fs';

const router = Router();

router.post('/api/sync/backup', async (req, res) => {
  try {
    const result = await generateDatabaseBackup();

    if (!result.success) {
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

    if (!filename.endsWith('.dump') || !filename.startsWith('budget_tracker_')) {
      return res.status(400).json({ error: 'Invalid filename' });
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
  try {
    const uploadedFile = req.files?.backup;

    if (!uploadedFile || Array.isArray(uploadedFile)) {
      return res.status(400).json({ error: 'No backup file provided' });
    }

    const backupPath = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    const tempPath = path.join(backupPath, uploadedFile.name);

    // Save the uploaded file temporarily
    await uploadedFile.mv(tempPath);

    // Restore the database from the backup
    const result = await restoreDatabaseBackup(tempPath);

    // Clean up the temporary file
    fs.unlinkSync(tempPath);

    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to restore backup' 
      });
    }

    res.json({ message: 'Database restored successfully' });
  } catch (error) {
    console.error('Error in restore endpoint:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

export default router;