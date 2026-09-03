import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;

// scryptSync is intentionally slow, and each derived key never changes within a running process,
// so keys are memoized per version rather than re-derived on every encrypt/decrypt call. The salt
// is a fixed literal rather than a per-value random salt -- that's fine for deriving a single
// symmetric key from one high-entropy secret (unlike password hashing, there's no list of
// low-entropy secrets to protect from precomputation here).
//
// Ciphertext is prefixed with a key-version id ("v1:iv:enc:tag") so a future key rotation is
// actually possible: add a new MASTER_KEY_V2 env var, a "v2" entry below, bump CURRENT_KEY_VERSION,
// and old values keep decrypting under their original key while new ones use the new one. Existing
// rows predate this prefix (plain "iv:enc:tag", no version segment) -- decrypt() treats those as v1
// under the original MASTER_KEY/salt, so no migration is needed for data already in the database.
const CURRENT_KEY_VERSION = "v1";

const KEY_DERIVATIONS: Record<string, () => string> = {
  v1: () => {
    const master = process.env.MASTER_KEY;
    if (!master) throw new Error("MASTER_KEY is not set");
    return master;
  },
};

const keyCache = new Map<string, Buffer>();

function getKey(version: string): Buffer {
  const cached = keyCache.get(version);
  if (cached) return cached;

  const deriveMaster = KEY_DERIVATIONS[version];
  if (!deriveMaster) throw new Error(`Unknown encryption key version "${version}"`);

  const key = crypto.scryptSync(deriveMaster(), "postmost-salt", KEY_LENGTH);
  keyCache.set(version, key);
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getKey(CURRENT_KEY_VERSION);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${CURRENT_KEY_VERSION}:${iv.toString("hex")}:${encrypted.toString("hex")}:${authTag.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  // Legacy rows (predating key versioning) are exactly "iv:enc:tag" -- three segments, no version.
  // Versioned rows are "v1:iv:enc:tag" -- four segments, first one always "v<number>".
  const [version, ivHex, encryptedHex, authTagHex] =
    parts.length === 3 ? ["v1", ...parts] : parts;
  if (!ivHex || !encryptedHex || !authTagHex) {
    throw new Error("Invalid encrypted value");
  }
  const key = getKey(version);
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
