import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  // Hash the key to ensure it's exactly 32 bytes for AES-256
  return crypto.createHash("sha256").update(key).digest();
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Combine IV + auth tag + encrypted data
  return iv.toString("hex") + authTag.toString("hex") + encrypted;
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();

  // Extract IV, auth tag, and encrypted data
  const iv = Buffer.from(encryptedText.slice(0, IV_LENGTH * 2), "hex");
  const authTag = Buffer.from(
    encryptedText.slice(IV_LENGTH * 2, IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2),
    "hex"
  );
  const encrypted = encryptedText.slice(IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// Mask API key for display (show only last 4 characters)
export function maskApiKey(key: string): string {
  if (key.length <= 8) {
    return "••••••••";
  }
  return "••••••••" + key.slice(-4);
}
