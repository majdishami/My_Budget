import { Router } from 'express';
import { generateDatabaseBackup, restoreDatabaseBackup } from '../utils/db-sync';
import path from 'path';
import fs from 'fs';
import type { UploadedFile } from 'express-fileupload';
import { logger } from '../lib/logger';

const router = Router();

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

router.post('/api/sync/backup', async (req, res) => {
  try {
    logger.info('Starting database backup process');
    const result = await generateDatabaseBackup();

    if (!result.success) {
      logger.error('Backup generation failed', { error: result.error });
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate backup'
      });
    }

    logger.info('Backup generated successfully', { fileName: result.fileName });
    res.json({
      success: true,
      data: {
        downloadUrl: `/api/sync/download/${result.fileName}`
      },
      message: 'Backup generated successfully'
    });
  } catch (error) {
    logger.error('Error in backup endpoint', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

router.get('/api/sync/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'tmp', filename);

    logger.info('Processing backup download request', { filename, filePath });

    if (!fs.existsSync(filePath) || !filename.toLowerCase().endsWith('.json')) {
      logger.error('Invalid or missing backup file', { filePath });
      return res.status(404).json({
        success: false,
        error: 'Invalid or missing backup file'
      });
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        logger.error('Error downloading file', { error: err });
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Error downloading backup file'
          });
        }
      }

      // Clean up the file after download
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          logger.error('Error deleting temporary file', { error: unlinkErr });
        } else {
          logger.info('Temporary file cleaned up successfully', { filePath });
        }
      });
    });
  } catch (error) {
    logger.error('Error in download endpoint', { error });
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
});

router.post('/api/sync/restore', async (req, res) => {
  try {
    logger.info('Received restore request', {
      files: req.files ? Object.keys(req.files) : 'no files',
      contentType: req.get('Content-Type')
    });

    if (!req.files || !req.files.backup) {
      logger.error('No file uploaded for restore');
      return res.status(400).json({
        success: false,
        error: 'No backup file provided'
      });
    }

    const uploadedFile = req.files.backup as UploadedFile;
    logger.info('Processing uploaded file', {
      name: uploadedFile.name,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype
    });

    // Create tmp directory if it doesn't exist
    const backupPath = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    // Generate a new filename with .json extension
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tempPath = path.join(backupPath, `restore_${timestamp}.json`);
    logger.info('Moving file to temporary location', { tempPath });

    try {
      await uploadedFile.mv(tempPath);
      logger.info('File moved successfully');

      if (!fs.existsSync(tempPath)) {
        throw new Error('Failed to move uploaded file to temporary location');
      }

      // Verify JSON format
      try {
        const fileContent = fs.readFileSync(tempPath, 'utf-8');
        JSON.parse(fileContent);
        logger.info('Verified file is valid JSON');
      } catch (parseError) {
        logger.error('JSON parse error', { error: parseError });
        throw new Error('Invalid JSON format in backup file');
      }

      logger.info('Starting database restore...');
      const result = await restoreDatabaseBackup(tempPath);
      logger.info('Restore completed', { result });

      // Clean up the temporary file
      fs.unlinkSync(tempPath);
      logger.info('Temporary file cleaned up');

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || 'Failed to restore backup'
        });
      }

      res.json({
        success: true,
        message: 'Database restored successfully'
      });
    } catch (error) {
      logger.error('Error during file processing', { error });
      // Clean up the temp file if it exists
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw error;
    }
  } catch (error) {
    logger.error('Error in restore endpoint', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;