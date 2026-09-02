import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStorage, isStorageConfigured } from "@/lib/storage";
import { isAllowedImageType, listingPhotoKey, MAX_IMAGE_BYTES } from "@/lib/storage/keys";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILES_PER_REQUEST = 20;
const UPLOAD_WINDOW_MS = 10 * 60 * 1000;
const UPLOAD_MAX_REQUESTS_PER_WINDOW = 60;

interface RequestedFile {
  contentType: string;
  size: number;
}

function parseFiles(body: unknown): RequestedFile[] | { error: string } {
  const files = (body as { files?: unknown })?.files;
  if (!Array.isArray(files) || files.length === 0) {
    return { error: "Provide a non-empty files array" };
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return { error: `Upload at most ${MAX_FILES_PER_REQUEST} images at a time` };
  }

  const parsed: RequestedFile[] = [];
  for (const file of files) {
    const contentType = typeof (file as { contentType?: unknown })?.contentType === "string" ? (file as { contentType: string }).contentType : "";
    const size = typeof (file as { size?: unknown })?.size === "number" ? (file as { size: number }).size : NaN;

    if (!isAllowedImageType(contentType)) {
      return { error: `Unsupported image type: ${contentType || "unknown"}` };
    }
    if (!Number.isFinite(size) || size <= 0) {
      return { error: "Each file needs a valid size" };
    }
    if (size > MAX_IMAGE_BYTES) {
      return { error: `Images must be smaller than ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB` };
    }
    parsed.push({ contentType, size });
  }
  return parsed;
}

/**
 * Returns presigned PUT URLs so the browser uploads images straight to object
 * storage, bypassing the serverless request body limit. The returned `url` is
 * the public CDN URL to persist on the listing photo.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Image storage is not configured" }, { status: 503 });
  }

  const rateCheck = await checkRateLimit(`upload:${userId}`, { windowMs: UPLOAD_WINDOW_MS, max: UPLOAD_MAX_REQUESTS_PER_WINDOW });
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Too many upload requests. Please wait a bit and try again." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const files = parseFiles(body);
  if ("error" in files) {
    return NextResponse.json({ error: files.error }, { status: 400 });
  }

  const storage = getStorage();
  try {
    const uploads = await Promise.all(
      files.map((file) => storage.createPresignedUpload(listingPhotoKey(userId, file.contentType), file.contentType))
    );
    return NextResponse.json({ uploads });
  } catch (err) {
    console.error("Failed to presign uploads", err);
    return NextResponse.json({ error: "Failed to prepare upload" }, { status: 500 });
  }
}
