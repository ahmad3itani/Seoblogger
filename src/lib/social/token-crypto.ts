// ─── Token Encryption / Decryption ─────────────────────────────────────────
// Encrypts social platform access tokens at rest using AES-256-CBC.
// Requires ENCRYPTION_KEY env var (32-char random string).

import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_KEY env var must be set and at least 32 characters.");
  }
  // Use exactly 32 bytes
  return Buffer.from(key.substring(0, 32), "utf8");
}

export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  // Format: iv(hex):ciphertext(hex)
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(encrypted: string): string {
  const [ivHex, dataHex] = encrypted.split(":");
  if (!ivHex || !dataHex) throw new Error("Invalid encrypted token format.");
  const iv = Buffer.from(ivHex, "hex");
  const encryptedBuf = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);
  return decrypted.toString("utf8");
}
