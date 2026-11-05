import fs from "fs";
import path from "path";
import type { ImageStorageProvider, UploadOptions, UploadResult } from "./types.ts";

export class LocalStorageProvider implements ImageStorageProvider {
  name = "local";
  private uploadDir: string;
  private baseUrl: string;

  constructor(options?: { uploadDir?: string; baseUrl?: string }) {
    this.uploadDir = options?.uploadDir || path.join(process.cwd(), "public", "uploads");
    this.baseUrl = options?.baseUrl || "/uploads";
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    const { buffer, fileName, folder } = options;
    const subDir = folder ? folder.replace(/^\/+|\/+$/g, "") : "general";
    const targetFolder = path.join(this.uploadDir, subDir);

    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const filePath = path.join(targetFolder, fileName);
    fs.writeFileSync(filePath, buffer);

    const key = `${subDir}/${fileName}`;
    const url = `${this.baseUrl}/${subDir}/${fileName}`;

    return {
      url,
      key,
      provider: "local",
    };
  }
}
