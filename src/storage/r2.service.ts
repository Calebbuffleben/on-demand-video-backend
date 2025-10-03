import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  DeleteObjectsCommand,
  CompletedPart,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2Service {
  private s3: S3Client;
  private bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('R2_ENDPOINT', '');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID', '');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY', '');
    this.bucket = this.config.get<string>('R2_BUCKET', '');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }

  async getPresignedPutUrl(key: string, contentType?: string, expiresSeconds: number = 900): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    return getSignedUrl(this.s3, command, { expiresIn: expiresSeconds });
  }

  async getPresignedGetUrl(key: string, expiresSeconds: number = 900): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: expiresSeconds });
  }

  async putObject(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<void> {
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body as any, ContentType: contentType }));
  }

  async getObjectStream(key: string): Promise<{ stream: NodeJS.ReadableStream; contentType?: string; contentLength?: number; eTag?: string; lastModified?: Date }> {
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const stream = res.Body as unknown as NodeJS.ReadableStream;
    const contentType = res.ContentType;
    const contentLength = typeof res.ContentLength === 'number' ? res.ContentLength : undefined;
    const eTag = typeof res.ETag === 'string' ? res.ETag : undefined;
    const lastModified = res.LastModified instanceof Date ? res.LastModified : undefined;
    return { stream, contentType, contentLength, eTag, lastModified };
  }

  async list(prefix: string, maxKeys: number = 1000) {
    return this.s3.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, MaxKeys: maxKeys }));
  }

  // Calculate total size in bytes for a given prefix
  async getTotalSizeForPrefix(prefix: string): Promise<number> {
    let continuationToken: string | undefined = undefined;
    let total = 0;
    do {
      const res = await this.s3.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }));
      (res.Contents || []).forEach(obj => {
        if (typeof obj.Size === 'number') total += obj.Size;
      });
      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);
    return total;
  }

  async multipartUpload(key: string, parts: Array<{ Body: Buffer | Uint8Array | string; PartNumber: number }>, contentType?: string) {
    const create = await this.s3.send(new CreateMultipartUploadCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }));
    const uploadId = create.UploadId!;
    const uploadedParts: CompletedPart[] = [];
    try {
      for (const part of parts) {
        const res = await this.s3.send(new UploadPartCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId, PartNumber: part.PartNumber, Body: part.Body as any }));
        uploadedParts.push({ ETag: res.ETag!, PartNumber: part.PartNumber });
      }
      await this.s3.send(new CompleteMultipartUploadCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId, MultipartUpload: { Parts: uploadedParts } }));
    } catch (err) {
      await this.s3.send(new AbortMultipartUploadCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId })).catch(() => undefined);
      throw err;
    }
  }

  // Multipart presign flow for browser uploads
  async createMultipartUpload(key: string, contentType?: string) {
    const res = await this.s3.send(new CreateMultipartUploadCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }));
    return { uploadId: res.UploadId! };
  }

  async getPresignedUploadPartUrl(key: string, uploadId: string, partNumber: number, expiresSeconds: number = 900) {
    const cmd = new UploadPartCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId, PartNumber: partNumber });
    const url = await getSignedUrl(this.s3, cmd, { expiresIn: expiresSeconds });
    return url;
  }

  async completeMultipartUpload(key: string, uploadId: string, parts: Array<{ ETag: string; PartNumber: number }>) {
    await this.s3.send(new CompleteMultipartUploadCommand({
      Bucket: this.bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }));
  }

  async abortMultipartUpload(key: string, uploadId: string) {
    await this.s3.send(new AbortMultipartUploadCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId }));
  }

  async deletePrefix(prefix: string) {
    // List all objects with the prefix
    const response = await this.list(prefix);
    const objects = response.Contents || [];
    
    if (objects.length === 0) {
      return; // Nothing to delete
    }

    // Delete objects in batches (max 1000 per request)
    const batchSize = 1000;
    for (let i = 0; i < objects.length; i += batchSize) {
      const batch = objects.slice(i, i + batchSize);
      const deleteParams = {
        Bucket: this.bucket,
        Delete: {
          Objects: batch.map(obj => ({ Key: obj.Key! })),
        },
      };

      await this.s3.send(new DeleteObjectsCommand(deleteParams));
    }
  }
}


