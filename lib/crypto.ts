import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;

// scryptSync is intentionally slow, and MASTER_KEY never changes within a running process, so
// the derived key is memoized rather than re-derived on every encrypt/decrypt call. The salt is
// a fixed literal rather than a per-value random salt -- that's fine for deriving a single
// symmetric key from one high-entropy secret (unlike password hashing, there's no list of
// low-entropy secrets to protect from precomputation here), but note there's no rotation path:
// changing MASTER_KEY silently breaks decryption of every value already encrypted with the old one.
let cachedKey: Buffer | null = null;
let cachedMaster: string | null = null;

function getKey(): Buffer {
  const master = process.env.MASTER_KEY;
  if (!master) {
    throw new Error("MASTER_KEY is not set");
  }
  if (cachedKey && cachedMaster === master) return cachedKey;
  cachedKey = crypto.scryptSync(master, "postmost-salt", KEY_LENGTH);
  cachedMaster = master;
  return cachedKey;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted.toString("hex")}:${authTag.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const [ivHex, encryptedHex, authTagHex] = ciphertext.split(":");
  if (!ivHex || !encryptedHex || !authTagHex) {
    throw new Error("Invalid encrypted value");
  }
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
