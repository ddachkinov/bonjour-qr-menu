import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import type { PresignedUploadResponse } from '@qrmenu/shared-types';

const s3 = new AWS.S3({
  accessKeyId: config.s3.accessKey,
  secretAccessKey: config.s3.secret,
  region: config.s3.region,
  ...(config.s3.endpoint && { endpoint: config.s3.endpoint }),
});

export class UploadService {
  static async generatePresignedUpload(
    tenantId: string,
    filename: string,
    mimeType: string,
    intendedUse: string
  ): Promise<PresignedUploadResponse> {
    // Validate mime type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (!allowedTypes.includes(mimeType)) {
      throw new AppError('Invalid file type. Only images are allowed.', 400);
    }

    // Generate unique object key
    const extension = filename.split('.').pop();
    const objectKey = `${tenantId}/${intendedUse}/${uuidv4()}.${extension}`;

    const params = {
      Bucket: config.s3.bucket,
      Key: objectKey,
      Expires: 300, // 5 minutes
      ContentType: mimeType,
      ACL: 'public-read',
    };

    try {
      const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

      const publicUrl = config.cdn.baseUrl
        ? `${config.cdn.baseUrl}/${objectKey}`
        : `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${objectKey}`;

      logger.info('Presigned upload URL generated', {
        tenantId,
        objectKey,
        mimeType,
      });

      return {
        upload_url: uploadUrl,
        object_key: objectKey,
        public_url: publicUrl,
      };
    } catch (error) {
      logger.error('Failed to generate presigned URL', { error, tenantId });
      throw new AppError('Failed to generate upload URL', 500);
    }
  }

  static async deleteObject(objectKey: string): Promise<void> {
    try {
      await s3
        .deleteObject({
          Bucket: config.s3.bucket,
          Key: objectKey,
        })
        .promise();

      logger.info('Object deleted', { objectKey });
    } catch (error) {
      logger.error('Failed to delete object', { error, objectKey });
      throw new AppError('Failed to delete file', 500);
    }
  }

  static async listObjects(prefix: string): Promise<string[]> {
    try {
      const response = await s3
        .listObjectsV2({
          Bucket: config.s3.bucket,
          Prefix: prefix,
        })
        .promise();

      return response.Contents?.map((obj) => obj.Key || '') || [];
    } catch (error) {
      logger.error('Failed to list objects', { error, prefix });
      throw new AppError('Failed to list files', 500);
    }
  }
}
