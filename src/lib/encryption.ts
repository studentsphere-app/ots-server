import crypto from "node:crypto";

// The encryption key should be 32 bytes (256 bits) for AES-256-GCM.
// In production, this MUST come from an environment variable.
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef"; // 32 chars fallback for dev

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error("ENCRYPTION_KEY must be exactly 32 characters long.");
}

const ALGORITHM = "aes-256-gcm";

export function encrypt(text: string): { encryptedData: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv
  );

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return {
    encryptedData: `${encrypted}:${authTag}`,
    iv: iv.toString("hex"),
  };
}

export function decrypt(encryptedData: string, ivHex: string): string {
  const [encryptedText, authTagHex] = encryptedData.split(":");

  if (!encryptedText || !authTagHex) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
