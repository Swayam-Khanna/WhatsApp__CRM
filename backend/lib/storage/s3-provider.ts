import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { ImageStorageProvider, UploadOptions, UploadResult } from "./types.ts";

export interface S3Config {
  endpoint?: string;
  region?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrlPrefix?: string;
  forcePathStyle?: boolean;
}

export class S3StorageProvider implements ImageStorageProvider {
  name = "s3";
  private client: S3Client;
  private bucket: string;
  private publicUrlPrefix?: string;
  private endpoint?: string;

  constructor(config: S3Config) {
    this.bucket = config.bucket;
    this.publicUrlPrefix = config.publicUrlPrefix;
    this.endpoint = config.endpoint;

    this.client = new S3Client({
      region: config.region || "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? true,
    });
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    const { buffer, fileName, contentType, folder } = options;
    const cleanFolder = folder ? folder.replace(/^\/+|\/+$/g, "") : "uploads";
    const key = `${cleanFolder}/${fileName}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    let url: string;
    if (this.publicUrlPrefix) {
      const cleanPrefix = this.publicUrlPrefix.replace(/\/+$/, "");
      url = `${cleanPrefix}/${key}`;
    } else {
      url = `/api/storage/${key}`;
    }

    return {
      url,
      key,
      provider: "neon-storage",
    };
  }
}

