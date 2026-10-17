/**
 * Client-side image compression and upload helpers.
 * Ensures images uploaded by users are pre-compressed and routed to the
 * centralized server saveImage endpoint (/api/upload).
 */
export async function compressImage(file: File, maxDimension = 1200, quality = 0.8): Promise<File> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const isImage =
    file.type.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(extension || "");
  if (!isImage) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
            const compressedFile = new File([blob], `${nameWithoutExt}.webp`, {
              type: "image/webp",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/webp",
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

import { fileToBase64 } from "./file-to-base64";

export async function base64ToFile(base64DataUrl: string, filename = "image.jpg"): Promise<File> {
  let dataUrl = base64DataUrl;
  if (!dataUrl.includes(",")) {
    dataUrl = "data:image/jpeg;base64," + dataUrl;
  }
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1].trim());
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Uploads a File directly to /api/upload (which compresses to <=300KB WebP and stores in Object Storage)
 */
export async function uploadImageToServer(file: File, folder = "prajnaa/general"): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Upload failed with status ${res.status}`);
  }
  return data.url;
}

/**
 * Converts a base64 image or file into an Object Storage URL by routing it to /api/upload.
 * Prevents large binary payloads from bloating PostgreSQL.
 */
export async function optimizeBase64Image(base64Str: string, folder = "prajnaa/general"): Promise<string> {
  if (!base64Str) {
    return base64Str;
  }
  if (base64Str.startsWith("http://") || base64Str.startsWith("https://") || base64Str.startsWith("/")) {
    return base64Str;
  }

  // If in browser, upload directly to /api/upload
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64Str, folder }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.url) {
        return data.url;
      }
    } catch (e) {
      console.warn("Failed to upload base64 image to server:", e);
    }
  }

  return base64Str;
}
