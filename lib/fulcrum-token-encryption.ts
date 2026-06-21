import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const algorithm = "aes-256-gcm";
const keyLengthBytes = 32;

export class FulcrumEncryptionKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FulcrumEncryptionKeyError";
  }
}

export function isFulcrumEncryptionKeyError(
  error: unknown,
): error is FulcrumEncryptionKeyError {
  return error instanceof FulcrumEncryptionKeyError;
}

export function isFulcrumTokenEncryptionConfigured() {
  try {
    getFulcrumEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptFulcrumApiToken(token: string) {
  const key = getFulcrumEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptFulcrumApiToken(encryptedToken: string) {
  const key = getFulcrumEncryptionKey();
  const [version, iv, tag, encrypted] = encryptedToken.split(":");

  if (version !== "v1" || !iv || !tag || !encrypted) {
    throw new Error("Fulcrum token payload is not in a supported format.");
  }

  const decipher = createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function createFulcrumTokenHint(token: string) {
  const trimmedToken = token.trim();

  if (trimmedToken.length <= 4) {
    return "Saved token";
  }

  return `Saved token ending ${trimmedToken.slice(-4)}`;
}

function getFulcrumEncryptionKey() {
  const encodedKey = process.env["FULCRUM_TOKEN_ENCRYPTION_KEY"];

  if (!encodedKey) {
    throw new FulcrumEncryptionKeyError(
      "FULCRUM_TOKEN_ENCRYPTION_KEY is required to save Fulcrum tokens.",
    );
  }

  const key = Buffer.from(encodedKey, "base64");

  if (key.length !== keyLengthBytes) {
    throw new FulcrumEncryptionKeyError(
      "FULCRUM_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }

  return key;
}
