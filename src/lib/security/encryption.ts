import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * OAuth Token Encryption using AES-256-GCM
 *
 * Provides authenticated encryption for sensitive data like OAuth tokens.
 * - AES-256: 256-bit key, highly secure
 * - GCM mode: Provides both encryption AND integrity verification
 * - Unique IV per encryption prevents pattern analysis
 *
 * Required env var: TOKEN_ENCRYPTION_KEY (32+ character secret)
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard IV length
const AUTH_TAG_LENGTH = 16;
const SALT = "bloggerseo-token-salt"; // Fixed salt for key derivation

// ─── Key Derivation ───────────────────────────────────────────────────────────

let _derivedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (_derivedKey) return _derivedKey;

  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY environment variable is required for token encryption. " +
        "Generate with: openssl rand -base64 32"
    );
  }

  if (secret.length < 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be at least 32 characters. " +
        "Generate with: openssl rand -base64 32"
    );
  }

  // Derive a 256-bit key from the secret using scrypt
  _derivedKey = scryptSync(secret, SALT, 32);
  return _derivedKey;
}

// ─── Encryption ───────────────────────────────────────────────────────────────

/**
 * Encrypt a string value using AES-256-GCM.
 * Returns base64-encoded string: IV + ciphertext + authTag
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: base64(iv + ciphertext + authTag)
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine: IV (12 bytes) + ciphertext (variable) + authTag (16 bytes)
  const combined = Buffer.concat([iv, encrypted, authTag]);

  return combined.toString("base64");
}

// ─── Decryption ───────────────────────────────────────────────────────────────

/**
 * Decrypt an AES-256-GCM encrypted string.
 *
 * @param encryptedBase64 - The base64-encoded encrypted data
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export function decryptToken(encryptedBase64: string): string {
  const key = getEncryptionKey();

  const combined = Buffer.from(encryptedBase64, "base64");

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

// ─── Safe Wrappers ────────────────────────────────────────────────────────────

/**
 * Safely encrypt a token, returning null if input is null/undefined.
 * Useful when dealing with optional tokens.
 */
export function encryptTokenSafe(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  return encryptToken(plaintext);
}

/**
 * Safely decrypt a token, returning null if input is null/undefined.
 * Also handles decryption errors gracefully (returns null instead of throwing).
 */
export function decryptTokenSafe(encryptedBase64: string | null | undefined): string | null {
  if (!encryptedBase64) return null;

  try {
    return decryptToken(encryptedBase64);
  } catch (error) {
    // Log error but don't expose details
    console.error("[Encryption] Failed to decrypt token - may be corrupted or key changed");
    return null;
  }
}

/**
 * Check if a string appears to be encrypted (base64 with minimum length).
 * Useful for migration scripts to identify unencrypted legacy data.
 */
export function isLikelyEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;

  // Encrypted tokens are base64 and at least IV + authTag length
  const minEncryptedLength = Math.ceil((IV_LENGTH + AUTH_TAG_LENGTH) * 4 / 3);

  // Check if it looks like base64
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return value.length >= minEncryptedLength && base64Regex.test(value);
}

// ─── Migration Helper ─────────────────────────────────────────────────────────

/**
 * Encrypt a token if it's not already encrypted.
 * For use in migration scripts to encrypt existing plaintext tokens.
 */
export function ensureEncrypted(value: string | null | undefined): string | null {
  if (!value) return null;

  // If it looks like it might already be encrypted, try to decrypt
  if (isLikelyEncrypted(value)) {
    try {
      // Try to decrypt - if it works, it's already encrypted
      decryptToken(value);
      return value; // Already encrypted
    } catch {
      // Decryption failed, so it's not encrypted (or wrong key)
      // Fall through to encrypt it
    }
  }

  return encryptToken(value);
}

// ─── Environment Check ────────────────────────────────────────────────────────

/**
 * Check if encryption is properly configured.
 * Call this at startup to fail fast if encryption key is missing.
 */
export function validateEncryptionConfig(): { valid: boolean; error?: string } {
  try {
    getEncryptionKey();
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown encryption config error",
    };
  }
}
