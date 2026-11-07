import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // Standard 96-bit IV for AES-GCM
const AUTH_TAG_LENGTH_BYTES = 16;
const CIPHER_PREFIX = "enc:v1";

/**
 * Derives a consistent 32-byte AES-256 key from environment variable.
 */
function getEncryptionKey(): Buffer {
  const secret =
    process.env.PAN_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    "prajnaa-default-fallback-dev-key-change-in-prod";

  if (
    process.env.NODE_ENV === "production" &&
    !process.env.PAN_ENCRYPTION_KEY &&
    !process.env.ENCRYPTION_SECRET
  ) {
    console.warn(
      "[Crypto] WARNING: PAN_ENCRYPTION_KEY or ENCRYPTION_SECRET is not set in production. Using fallback secret is unsafe."
    );
  }

  // Derive 32 bytes using SHA-256
  return crypto.createHash("sha256").update(secret, "utf-8").digest();
}

/**
 * Encrypts a PAN number using AES-256-GCM with authentication tag.
 * Returns formatted string: "enc:v1:<iv_hex>:<authTag_hex>:<cipher_hex>"
 */
export function encryptPan(panNumber: string): string {
  if (!panNumber || typeof panNumber !== "string") return panNumber;
  const trimmed = panNumber.trim();
  if (!trimmed) return "";

  // If already encrypted, do not double-encrypt (case-insensitive prefix check)
  if (trimmed.toLowerCase().startsWith(`${CIPHER_PREFIX}:`)) {
    return trimmed;
  }

  const clean = trimmed.toUpperCase();

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  let encrypted = cipher.update(clean, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${CIPHER_PREFIX}:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted PAN string back to plain text.
 * If the input is not encrypted, returns as is.
 */
export function decryptPan(encryptedText: string): string {
  if (!encryptedText || typeof encryptedText !== "string") return encryptedText;
  const trimmed = encryptedText.trim();

  if (!trimmed.toLowerCase().startsWith(`${CIPHER_PREFIX}:`)) {
    return trimmed; // Plain text or legacy format
  }

  const parts = trimmed.split(":");
  if (parts.length !== 5) {
    throw new Error("[Crypto] Invalid encrypted PAN format");
  }

  const [, , ivHex, authTagHex, cipherHex] = parts;
  if (!ivHex || !authTagHex || !cipherHex) {
    throw new Error("[Crypto] Malformed encrypted PAN components");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Masks a PAN number for safe UI display (e.g. "ABCDE1234F" -> "ABCDE****F").
 */
export function maskPan(panOrEncrypted: string): string {
  if (!panOrEncrypted || typeof panOrEncrypted !== "string") return "";
  let pan = panOrEncrypted.trim();
  if (pan.toLowerCase().startsWith(`${CIPHER_PREFIX}:`)) {
    try {
      pan = decryptPan(pan);
    } catch {
      return "XXXXX****X";
    }
  }

  if (pan.length <= 4) {
    return "****";
  }

  // Standard Indian PAN is 10 chars: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
  if (pan.length === 10) {
    return `${pan.slice(0, 5)}****${pan.slice(9)}`;
  }

  return `${pan.slice(0, 2)}****${pan.slice(-2)}`;
}
