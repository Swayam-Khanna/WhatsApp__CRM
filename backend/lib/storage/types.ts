export interface UploadOptions {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  folder?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  provider: string;
}

export interface ImageStorageProvider {
  name: string;
  upload(options: UploadOptions): Promise<UploadResult>;
}

export const STORAGE_VERSION = "1.0.0";
