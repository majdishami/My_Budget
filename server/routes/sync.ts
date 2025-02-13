import { Router } from 'express';
import { generateDatabaseBackup, restoreDatabaseBackup } from '../utils/db-sync';
import path from 'path';
import fs from 'fs';
import type { UploadedFile } from 'express-fileupload';

const router = Router();

// Define backup directory and retention policy
const BACKUP_DIR = path.join(process.cwd(), 'tmp');
const MAX_BACKUPS = 5;

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Clean old backups
function cleanOldBackups(backupDir: string, maxFiles = MAX_BACKUPS) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.json'))
      .map(file => ({ 
        file, 
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime() 
      }))
      .sort((a, b) => b.time - a.time); // Sort by most recent

    // Remove excess files
    while (files.length > maxFiles) {
      const oldFile = files.pop();
      if (oldFile) {
        const filePath = path.join(backupDir, oldFile.file);
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old backup: ${oldFile.file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning old backups:', error);
  }
}

router.post('/api/sync/backup', async (req, res) => {
  try {
    const result = await generateDatabaseBackup();

    if (!result.success) {
      console.error('Backup generation failed:', result.error);
      return res.status(500).json({ 
        error: result.error || 'Failed to generate backup' 
      });
    }

    // Clean old backups after successful generation
    cleanOldBackups(BACKUP_DIR);

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
    // Prevent directory traversal by using basename
    const safeFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    // Validate file exists and has correct extension
    if (!fs.existsSync(filePath) || !safeFilename.toLowerCase().endsWith('.json')) {
      console.error('Invalid or missing backup file:', filePath);
      return res.status(404).json({ error: 'Invalid or missing backup file' });
    }

    res.download(filePath, safeFilename, (err) => {
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

    // Generate a safe filename with .json extension
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeFilename = `restore_${timestamp}.json`;
    const tempPath = path.join(BACKUP_DIR, safeFilename);

    try {
      // Move the uploaded file
      await uploadedFile.mv(tempPath);
      console.log('File moved successfully to:', tempPath);

      // Verify file exists and is readable
      if (!fs.existsSync(tempPath)) {
        throw new Error('Failed to move uploaded file to temporary location');
      }

      // Validate JSON format
      try {
        const fileContent = fs.readFileSync(tempPath, 'utf-8');
        JSON.parse(fileContent);
        console.log('Verified file is valid JSON');
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid JSON format in backup file');
      }

      // Restore database from backup
      console.log('Starting database restore...');
      const result = await restoreDatabaseBackup(tempPath);
      console.log('Restore completed with result:', result);

      // Clean up temporary file
      fs.unlinkSync(tempPath);
      console.log('Temporary file cleaned up');

      if (!result.success) {
        return res.status(500).json({ 
          error: result.error || 'Failed to restore backup' 
        });
      }

      res.json({ message: 'Database restored successfully' });
    } catch (error) {
      console.error('Error during file processing:', error);
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