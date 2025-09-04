const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Configure AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined
});

class StorageService {
  // Upload to S3
  async uploadToS3(file, folder = '') {
    try {
      if (!process.env.AWS_S3_BUCKET) {
        // Fallback to local storage
        return this.uploadToLocal(file, folder);
      }

      const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname)}`;
      const key = folder ? `${folder}/${fileName}` : fileName;

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      });

      await s3Client.send(command);
      
      const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
      logger.info(`File uploaded to S3: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      logger.error('Error uploading to S3:', error);
      // Fallback to local storage
      return this.uploadToLocal(file, folder);
    }
  }

  // Upload to local storage
  async uploadToLocal(file, folder = '') {
    try {
      const uploadDir = path.join(__dirname, '../../uploads', folder);
      
      // Create directory if it doesn't exist
      await fs.mkdir(uploadDir, { recursive: true });

      const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname)}`;
      const filePath = path.join(uploadDir, fileName);

      // Write file
      await fs.writeFile(filePath, file.buffer);

      // Return relative URL
      const fileUrl = `/uploads/${folder}/${fileName}`.replace(/\/+/g, '/');
      
      logger.info(`File uploaded locally: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      logger.error('Error uploading to local storage:', error);
      throw error;
    }
  }

  // Delete from S3
  async deleteFromS3(fileUrl) {
    try {
      if (!process.env.AWS_S3_BUCKET) {
        return this.deleteFromLocal(fileUrl);
      }

      const key = fileUrl.split('.com/')[1];
      
      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key
      });

      await s3Client.send(command);
      
      logger.info(`File deleted from S3: ${key}`);
      return true;
    } catch (error) {
      logger.error('Error deleting from S3:', error);
      return false;
    }
  }

  // Delete from local storage
  async deleteFromLocal(fileUrl) {
    try {
      const filePath = path.join(__dirname, '../..', fileUrl);
      
      await fs.unlink(filePath);
      
      logger.info(`File deleted locally: ${fileUrl}`);
      return true;
    } catch (error) {
      logger.error('Error deleting from local storage:', error);
      return false;
    }
  }

  // Get signed URL for private files
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      if (!process.env.AWS_S3_BUCKET) {
        // For local files, return the direct URL
        return `/uploads/${key}`;
      }

      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw error;
    }
  }

  // Upload multiple files
  async uploadMultiple(files, folder = '') {
    try {
      const uploadPromises = files.map(file => this.uploadToS3(file, folder));
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      logger.error('Error uploading multiple files:', error);
      throw error;
    }
  }

  // Check if file exists
  async fileExists(key) {
    try {
      if (!process.env.AWS_S3_BUCKET) {
        const filePath = path.join(__dirname, '../..', `/uploads/${key}`);
        try {
          await fs.access(filePath);
          return true;
        } catch {
          return false;
        }
      }

      const command = new HeadObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get file metadata
  async getFileMetadata(key) {
    try {
      if (!process.env.AWS_S3_BUCKET) {
        const filePath = path.join(__dirname, '../..', `/uploads/${key}`);
        const stats = await fs.stat(filePath);
        return {
          size: stats.size,
          lastModified: stats.mtime
        };
      }

      const command = new HeadObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key
      });

      const metadata = await s3Client.send(command);
      return {
        size: metadata.ContentLength,
        contentType: metadata.ContentType,
        lastModified: metadata.LastModified
      };
    } catch (error) {
      logger.error('Error getting file metadata:', error);
      throw error;
    }
  }
}

module.exports = new StorageService();