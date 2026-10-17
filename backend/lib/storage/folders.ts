import fs from "fs";
import path from "path";

export interface StorageFolderConfig {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  allowedMimeTypes: string[];
  maxSizeMb: number;
}

export const STORAGE_FOLDERS: Record<string, StorageFolderConfig> = {
  products: {
    id: "products",
    name: "Products & Catalog",
    slug: "products",
    description: "Product catalog images, gallery photos, and pack shots",
    icon: "Package",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeMb: 5,
  },
  "farmers/profiles": {
    id: "farmers/profiles",
    name: "Farmer Profiles",
    slug: "farmers/profiles",
    description: "Farmer portrait photos, biography pictures, and farm cover banners",
    icon: "UserCheck",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeMb: 5,
  },
  "farmers/kyc": {
    id: "farmers/kyc",
    name: "Farmer KYC Documents",
    slug: "farmers/kyc",
    description: "Official identity verifications: PAN card, Aadhaar card, and bank passbooks",
    icon: "ShieldAlert",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    maxSizeMb: 10,
  },
  "farmers/certificates": {
    id: "farmers/certificates",
    name: "Certifications & Lab Reports",
    slug: "farmers/certificates",
    description: "Organic certificates, chemical residue reports, and laboratory COAs",
    icon: "Award",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    maxSizeMb: 10,
  },
  "harvest-journey": {
    id: "harvest-journey",
    name: "Harvest Journey & Traceability",
    slug: "harvest-journey",
    description: "Batch-by-batch harvest stages, field germination, and processing photos",
    icon: "Sprout",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeMb: 5,
  },
  "orders/invoices": {
    id: "orders/invoices",
    name: "Order Invoices & Receipts",
    slug: "orders/invoices",
    description: "System-generated tax invoices, dispatch packing slips, and delivery manifests",
    icon: "FileText",
    allowedMimeTypes: ["application/pdf", "image/png"],
    maxSizeMb: 10,
  },
  reviews: {
    id: "reviews",
    name: "Customer Reviews",
    slug: "reviews",
    description: "Verified customer photos and unboxing review uploads",
    icon: "Star",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeMb: 5,
  },
  "users/avatars": {
    id: "users/avatars",
    name: "User Avatars",
    slug: "users/avatars",
    description: "Customer profile photos and avatars",
    icon: "User",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeMb: 2,
  },
  "system/banners": {
    id: "system/banners",
    name: "System & Promotional Banners",
    slug: "system/banners",
    description: "Storefront hero carousels, seasonal badges, and marketing banners",
    icon: "Megaphone",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeMb: 5,
  },
};

/**
 * Ensures all standardized physical upload directories exist on disk
 */
export function ensureStorageFoldersExist(baseUploadDir?: string): void {
  const root = baseUploadDir || path.join(process.cwd(), "public", "uploads");

  for (const folderKey of Object.keys(STORAGE_FOLDERS)) {
    const fullPath = path.join(root, folderKey);
    if (!fs.existsSync(fullPath)) {
      try {
        fs.mkdirSync(fullPath, { recursive: true });
      } catch (e) {
        console.warn(`[Storage Folders] Could not create folder ${fullPath}:`, e);
      }
    }
  }
}

/**
 * Sanitizes and validates a requested folder path against the allowed folder taxonomy
 */
export function validateStorageFolder(folderName?: string): string {
  if (!folderName) return "products";
  const clean = folderName.trim().replace(/^\/+|\/+$/g, "");
  if (STORAGE_FOLDERS[clean]) return clean;

  // Partial or parent match (e.g. "farmers" -> "farmers/profiles")
  const matched = Object.keys(STORAGE_FOLDERS).find(
    (k) => k.startsWith(clean) || clean.startsWith(k)
  );
  return matched || "products";
}
