import { r2Adapter } from "@/lib/storage/adapters/r2";
import { StorageAdapter } from "@/lib/storage/types";

const adapters: Record<string, StorageAdapter> = {
  r2: r2Adapter,
};

export function getStorage(provider = process.env.STORAGE_PROVIDER || "r2"): StorageAdapter {
  const adapter = adapters[provider];
  if (!adapter) {
    throw new Error(`Unknown STORAGE_PROVIDER "${provider}". Available: ${Object.keys(adapters).join(", ")}`);
  }
  return adapter;
}

export function isStorageConfigured(): boolean {
  return Boolean(
    (process.env.R2_ACCOUNT_ID || process.env.S3_ENDPOINT) &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_BASE_URL
  );
}

export type { StorageAdapter } from "@/lib/storage/types";
