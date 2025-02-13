import { Router } from 'express';
import { generateDatabaseBackup, restoreDatabaseBackup } from '../utils/db-sync';
import path from 'path';
import fs from 'fs';
import type { UploadedFile } from 'express-fileupload';
import { logger } from '../lib/logger';

const router = Router();

router.post('/api/sync/backup', async (req, res) => {
  try {
    logger.info('Starting database backup');
    const result = await generateDatabaseBackup();

    if (!result.success) {
      logger.error('Backup failed', new Error(result.error));
      return res.status(500).json({ error: 'Failed to generate backup' });
    }

    res.json({
      message: 'Backup successful',
      downloadUrl: `/api/sync/download/${result.fileName}`
    });
  } catch (error) {
    logger.error('Backup error', error as Error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

router.get('/api/sync/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'tmp', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        logger.error('Download failed', err);
      }
      // Clean up file after download
      fs.unlink(filePath, () => {
        logger.info('Temporary file cleaned up');
      });
    });
  } catch (error) {
    logger.error('Download error', error as Error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
});

router.post('/api/sync/restore', async (req, res) => {
  try {
    if (!req.files?.backup) {
      return res.status(400).json({ error: 'No backup file provided' });
    }

    const uploadedFile = req.files.backup as UploadedFile;
    const backupPath = path.join(process.cwd(), 'tmp');
    const tempPath = path.join(backupPath, `restore_${Date.now()}.json`);

    try {
      await uploadedFile.mv(tempPath);
      const result = await restoreDatabaseBackup(tempPath);
      fs.unlinkSync(tempPath);

      if (!result.success) {
        return res.status(500).json({ error: 'Failed to restore backup' });
      }

      res.json({ message: 'Restore successful' });
    } catch (error) {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw error;
    }
  } catch (error) {
    logger.error('Restore error', error as Error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

export default router;