import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PresignedUpload, StorageAdapter, UploadResult } from "@/lib/storage/types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured. Set it to enable image storage.`);
  }
  return value;
}

function getBucket(): string {
  return requireEnv("R2_BUCKET");
}

function getPublicBaseUrl(): string {
  return requireEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
}

let client: S3Client | null = null;

/** S3 endpoint: R2 by default, overridable for other S3-compatible hosts (e.g. MinIO in tests). */
function getEndpoint(): string {
  return process.env.S3_ENDPOINT || `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;
}

function getClient(): S3Client {
  if (client) return client;
  client = new S3Client({
    region: "auto",
    endpoint: getEndpoint(),
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

async function toBytes(body: Buffer | Uint8Array | Blob): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body;
  return new Uint8Array(await body.arrayBuffer());
}

export const r2Adapter: StorageAdapter = {
  id: "r2",

  publicUrl(key: string): string {
    return `${getPublicBaseUrl()}/${key.replace(/^\/+/, "")}`;
  },

  async upload(key, body, contentType): Promise<UploadResult> {
    await getClient().send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        Body: await toBytes(body),
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    return { key, url: r2Adapter.publicUrl(key) };
  },

  async createPresignedUpload(key, contentType, expiresInSeconds = 600): Promise<PresignedUpload> {
    const uploadUrl = await getSignedUrl(
      getClient(),
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
      { expiresIn: expiresInSeconds }
    );
    return { uploadUrl, url: r2Adapter.publicUrl(key), key };
  },

  async delete(key): Promise<void> {
    await getClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
  },
};
