/**
 * KYC Validation Utilities
 * - Verhoeff Checksum for Aadhaar Validation
 * - Indian Income Tax PAN Regex Validation
 * - Secure Aadhaar Masking (UIDAI Compliant)
 * - Document File Format & Size Verifier
 */

// Verhoeff Algorithm Tables
const verhoeffD = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const verhoeffP = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const verhoeffInv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * Validates a number array using the Verhoeff checksum algorithm.
 */
export function validateVerhoeff(array: number[]): boolean {
  let c = 0;
  const reversedArray = [...array].reverse();
  for (let i = 0; i < reversedArray.length; i++) {
    c = verhoeffD[c][verhoeffP[i % 8][reversedArray[i]]];
  }
  return c === 0;
}

/**
 * Generates the Verhoeff check digit for an input number string.
 */
export function generateVerhoeffCheckDigit(numStr: string): number {
  let c = 0;
  const reversedArray = numStr.replace(/\D/g, "").split("").map(Number).reverse();
  for (let i = 0; i < reversedArray.length; i++) {
    c = verhoeffD[c][verhoeffP[(i + 1) % 8][reversedArray[i]]];
  }
  return verhoeffInv[c];
}

/**
 * Validates a 12-digit Indian Aadhaar number:
 * 1. Must be exactly 12 numeric digits
 * 2. Cannot start with 0 or 1
 * 3. Must pass the Verhoeff checksum algorithm
 */
export function validateAadhaar(aadhaar: string): { valid: boolean; error?: string } {
  if (!aadhaar) {
    return { valid: false, error: "Aadhaar number is required" };
  }

  // Allow masked inputs that are already verified (e.g., **** **** 1234 or XXXX-XXXX-1234)
  const isMasked =
    aadhaar.includes("*") ||
    aadhaar.toUpperCase().includes("X") ||
    aadhaar.startsWith("****");

  if (isMasked) {
    const cleanLast4 = aadhaar.replace(/\D/g, "");
    if (cleanLast4.length === 4) {
      return { valid: true };
    }
  }

  const clean = aadhaar.replace(/[\s-]/g, "");

  if (!/^\d+$/.test(clean)) {
    return { valid: false, error: "Aadhaar must contain only numeric digits" };
  }

  if (clean.length !== 12) {
    return {
      valid: false,
      error: `Aadhaar must be exactly 12 digits (currently ${clean.length})`,
    };
  }

  if (clean.charAt(0) === "0" || clean.charAt(0) === "1") {
    return {
      valid: false,
      error: "Aadhaar number cannot start with 0 or 1",
    };
  }

  const digits = clean.split("").map(Number);
  const isChecksumValid = validateVerhoeff(digits);

  if (!isChecksumValid) {
    return {
      valid: false,
      error: "Invalid Aadhaar number (checksum validation failed)",
    };
  }

  return { valid: true };
}

/**
 * Validates a 10-character Indian Permanent Account Number (PAN):
 * Pattern: ^[A-Z]{5}[0-9]{4}[A-Z]{1}$
 */
export function validatePan(pan: string): { valid: boolean; error?: string } {
  if (!pan) {
    return { valid: false, error: "PAN number is required" };
  }

  const clean = pan.trim().toUpperCase();

  if (clean.length !== 10) {
    return {
      valid: false,
      error: `PAN must be exactly 10 characters (currently ${clean.length})`,
    };
  }

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(clean)) {
    return {
      valid: false,
      error: "Invalid PAN format. Must match pattern: ABCDE1234F (5 letters, 4 digits, 1 letter)",
    };
  }

  return { valid: true };
}

/**
 * Masks an Aadhaar number to display only the last 4 digits (UIDAI compliance).
 * Format: XXXX-XXXX-1234
 */
export function maskAadhaar(aadhaar: string): string {
  if (!aadhaar) return "";
  const clean = aadhaar.replace(/\D/g, "");
  if (clean.length < 4) return "XXXX-XXXX-XXXX";
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

/**
 * Formats a raw Aadhaar input into 4-digit grouped display string.
 * Example: "123456789012" -> "1234 5678 9012"
 */
export function formatAadhaarDisplay(val: string): string {
  if (!val) return "";
  if (val.includes("*") || val.toUpperCase().includes("X")) {
    return val;
  }
  const clean = val.replace(/\D/g, "").slice(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.slice(i, i + 4));
  }
  return parts.join(" ");
}

/**
 * Validates document upload file format and size.
 * Allowed: JPEG, PNG, WEBP, PDF up to maxMb (default 5MB)
 */
export function validateKycFile(
  file: File | { size?: number; type?: string; name?: string } | null,
  maxMb = 5,
): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "Please upload a document file" };
  }

  const maxBytes = maxMb * 1024 * 1024;
  if (file.size && file.size > maxBytes) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of ${maxMb} MB`,
    };
  }

  const validMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (file.type && !validMimeTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: "Invalid file type. Only JPG, PNG, WEBP, and PDF files are allowed",
    };
  }

  return { valid: true };
}
