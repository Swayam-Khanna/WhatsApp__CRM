import type { ImageStorageProvider } from "./types.ts";
import { S3StorageProvider } from "./s3-provider.ts";
import { LocalStorageProvider } from "./local-provider.ts";

export type * from "./types.ts";
export * from "./types.ts";
export * from "./s3-provider.ts";
export * from "./local-provider.ts";

let defaultProvider: ImageStorageProvider | null = null;

export function getStorageProvider(): ImageStorageProvider {
  if (defaultProvider) return defaultProvider;

  const endpoint =
    process.env.OBJECT_STORAGE_ENDPOINT ||
    process.env.AWS_ENDPOINT_URL_S3 ||
    process.env.NEON_OBJECT_STORAGE_ENDPOINT;
  const bucket =
    process.env.OBJECT_STORAGE_BUCKET ||
    process.env.AWS_BUCKET ||
    process.env.NEON_OBJECT_STORAGE_BUCKET;
  const accessKeyId =
    process.env.OBJECT_STORAGE_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY;

  if (bucket && accessKeyId && secretAccessKey) {
    defaultProvider = new S3StorageProvider({
      endpoint,
      bucket,
      accessKeyId,
      secretAccessKey,
      region: process.env.OBJECT_STORAGE_REGION || process.env.AWS_REGION || "auto",
      publicUrlPrefix:
        process.env.OBJECT_STORAGE_PUBLIC_URL_PREFIX ||
        process.env.NEXT_PUBLIC_OBJECT_STORAGE_URL,
    });
    return defaultProvider;
  }

  // Fallback to local storage provider
  defaultProvider = new LocalStorageProvider();
  return defaultProvider;
}

export function setStorageProvider(provider: ImageStorageProvider) {
  defaultProvider = provider;
}
