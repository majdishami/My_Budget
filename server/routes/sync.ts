import { Router } from 'express';
import { generateDatabaseBackup, restoreDatabaseBackup } from '../utils/db-sync';
import path from 'path';
import fs from 'fs';
import type { UploadedFile } from 'express-fileupload';

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

    // Validate that the file exists and has the correct extension
    if (!fs.existsSync(filePath) || !filename.toLowerCase().endsWith('.json')) {
      console.error('Invalid or missing backup file:', filePath);
      return res.status(404).json({ error: 'Invalid or missing backup file' });
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
    console.log('Received restore request', {
      files: req.files ? Object.keys(req.files) : 'no files',
      contentType: req.get('Content-Type')
    });

    if (!req.files || !req.files.backup) {
      console.error('No file uploaded for restore');
      return res.status(400).json({ error: 'No backup file provided' });
    }

    const uploadedFile = req.files.backup as UploadedFile;
    console.log('Processing uploaded file:', {
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
    const tempPath = path.join(tmpDir, `restore_${timestamp}.json`);

    try {
      // Move the uploaded file to tmp directory
      await uploadedFile.mv(tempPath);
      console.log('File moved to temporary location:', tempPath);

      // Restore the database
      console.log('Starting database restore...');
      const result = await restoreDatabaseBackup(tempPath);
      console.log('Restore result:', result);

      // Clean up the temporary file
      fs.unlinkSync(tempPath);
      console.log('Temporary file cleaned up');

      if (!result.success) {
        return res.status(500).json({ 
          error: result.error || 'Failed to restore backup' 
        });
      }

      res.json({ 
        message: 'Database restored successfully',
        details: result.message 
      });
    } catch (error) {
      console.error('Error processing restore:', error);
      // Clean up temp file if it exists
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in restore endpoint:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

export default router;