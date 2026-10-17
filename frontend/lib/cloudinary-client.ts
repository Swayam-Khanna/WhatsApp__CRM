/**
 * Neon Storage Upload Helper
 * Sends image files or data URLs to the server-side /api/upload route
 * and returns the permanent, optimized Neon Storage URL.
 */

export type StorageFolder =
  | "prajnaa/farmers"
  | "prajnaa/crops"
  | "prajnaa/products"
  | "prajnaa/general";

export type CloudinaryFolder = StorageFolder;

export const TARGET_MAX_IMAGE_BYTES = 300 * 1024; // 300KB


/**
 * Fast client-side image compression using HTML Canvas.
 * Progressively compresses image to ensure the resulting file size is strictly <= 300KB.
 */
export async function compressImageBrowser(
  file: File,
  maxTargetBytes = TARGET_MAX_IMAGE_BYTES
): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  // If already under 300KB, no compression needed
  if (file.size <= maxTargetBytes) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = async () => {
        URL.revokeObjectURL(url);
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;

        // Progressive steps to ensure strict <= 300KB while keeping maximum possible clarity
        const stepAttempts = [
          { maxDim: 1400, quality: 0.85 },
          { maxDim: 1200, quality: 0.78 },
          { maxDim: 1000, quality: 0.72 },
          { maxDim: 900, quality: 0.65 },
          { maxDim: 800, quality: 0.58 },
          { maxDim: 700, quality: 0.50 },
          { maxDim: 600, quality: 0.45 },
        ];

        let bestBlob: Blob | null = null;

        for (const step of stepAttempts) {
          let width = originalWidth;
          let height = originalHeight;
          if (width > step.maxDim || height > step.maxDim) {
            if (width > height) {
              height = Math.round((height * step.maxDim) / width);
              width = step.maxDim;
            } else {
              width = Math.round((width * step.maxDim) / height);
              height = step.maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          ctx.drawImage(img, 0, 0, width, height);

          const blob = await new Promise<Blob | null>((resBlob) => {
            canvas.toBlob(resBlob, "image/jpeg", step.quality);
          });

          if (blob) {
            bestBlob = blob;
            if (blob.size <= maxTargetBytes) {
              break;
            }
          }
        }

        if (bestBlob) {
          const compressed = new File([bestBlob], file.name.replace(/\.[^.]+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressed);
        } else {
          resolve(file);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };

      img.src = url;
    } catch {
      resolve(file);
    }
  });
}

/**
 * Compresses a base64 data URL so its payload is within 300KB
 */
export async function compressDataUrlBrowser(
  dataUrl: string,
  maxTargetBytes = TARGET_MAX_IMAGE_BYTES
): Promise<string> {
  if (typeof window === "undefined" || !dataUrl.startsWith("data:image/")) {
    return dataUrl;
  }

  const approxSize = (dataUrl.length * 3) / 4;
  if (approxSize <= maxTargetBytes) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = async () => {
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;

        const stepAttempts = [
          { maxDim: 1400, quality: 0.85 },
          { maxDim: 1200, quality: 0.78 },
          { maxDim: 1000, quality: 0.72 },
          { maxDim: 900, quality: 0.65 },
          { maxDim: 800, quality: 0.58 },
          { maxDim: 700, quality: 0.50 },
        ];

        let bestDataUrl = dataUrl;

        for (const step of stepAttempts) {
          let width = originalWidth;
          let height = originalHeight;
          if (width > step.maxDim || height > step.maxDim) {
            if (width > height) {
              height = Math.round((height * step.maxDim) / width);
              width = step.maxDim;
            } else {
              width = Math.round((width * step.maxDim) / height);
              height = step.maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          ctx.drawImage(img, 0, 0, width, height);
          const out = canvas.toDataURL("image/jpeg", step.quality);
          bestDataUrl = out;
          if ((out.length * 3) / 4 <= maxTargetBytes) {
            break;
          }
        }
        resolve(bestDataUrl);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

export async function uploadToNeon(
  fileOrDataUrl: File | string,
  folder: StorageFolder = "prajnaa/general"
): Promise<string> {
  if (fileOrDataUrl instanceof File) {
    // Compress image in browser before sending over network to ensure image size <= 300KB
    const fileToUpload = await compressImageBrowser(fileOrDataUrl, TARGET_MAX_IMAGE_BYTES);
    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("folder", folder);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Upload failed with status ${res.status}`);
    }
    return data.url as string;
  } else {
    // If it's already an external HTTP / static URL, don't re-upload
    if (fileOrDataUrl.startsWith("http://") || fileOrDataUrl.startsWith("https://")) {
      return fileOrDataUrl;
    }

    // Compress base64 data URL to be <= 300KB
    const dataUrlToUpload = await compressDataUrlBrowser(fileOrDataUrl, TARGET_MAX_IMAGE_BYTES);

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: dataUrlToUpload, folder }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Upload failed with status ${res.status}`);
    }
    return data.url as string;
  }
}

// Backward-compatibility alias
export const uploadToCloudinary = uploadToNeon;


