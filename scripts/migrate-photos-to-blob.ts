/**
 * Backfills legacy base64 `data:` photos into cloud storage.
 *
 * Usage: npx tsx scripts/migrate-photos-to-blob.ts [--limit 100] [--dry-run]
 *
 * Idempotent: only rows whose url still starts with "data:" are processed, so
 * re-running only picks up whatever is left.
 */
import { PrismaClient } from "@prisma/client";
import { getStorage, isStorageConfigured } from "../lib/storage";
import { extensionForContentType } from "../lib/storage/keys";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

function parseDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const match = dataUrl.match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/);
  if (!match) return null;
  const [, contentType, isBase64, payload] = match;
  const buffer = isBase64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
  return { buffer, contentType };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : undefined;

  if (!isStorageConfigured()) {
    throw new Error("Storage env vars are missing (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL)");
  }

  const storage = getStorage();
  const photos = await prisma.photo.findMany({
    where: { url: { startsWith: "data:" } },
    select: { id: true, url: true, listing: { select: { userId: true } } },
    take: Number.isFinite(limit) ? limit : undefined,
  });

  console.log(`Found ${photos.length} base64 photo(s) to migrate${dryRun ? " (dry run)" : ""}`);

  let migrated = 0;
  let failed = 0;

  for (const photo of photos) {
    const parsed = parseDataUrl(photo.url);
    if (!parsed) {
      console.warn(`Skipping photo ${photo.id}: unrecognized data URL`);
      failed += 1;
      continue;
    }

    const ext = extensionForContentType(parsed.contentType) ?? "bin";
    const key = `listings/${photo.listing.userId}/${randomUUID()}.${ext}`;

    if (dryRun) {
      console.log(`Would upload photo ${photo.id} (${parsed.buffer.length} bytes) to ${key}`);
      migrated += 1;
      continue;
    }

    try {
      const { url } = await storage.upload(key, parsed.buffer, parsed.contentType);
      await prisma.photo.update({ where: { id: photo.id }, data: { url } });
      console.log(`Migrated photo ${photo.id} -> ${url}`);
      migrated += 1;
    } catch (err) {
      console.error(`Failed to migrate photo ${photo.id}:`, err);
      failed += 1;
    }
  }

  console.log(`Done. migrated=${migrated} failed=${failed}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
