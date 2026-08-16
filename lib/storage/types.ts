export interface UploadResult {
  url: string;
  key: string;
}

export interface PresignedUpload {
  /** Short-lived URL the browser PUTs the file body to. */
  uploadUrl: string;
  /** Public (CDN) URL the file is readable at once uploaded. */
  url: string;
  key: string;
}

export interface StorageAdapter {
  id: string;
  upload(key: string, body: Buffer | Uint8Array | Blob, contentType: string): Promise<UploadResult>;
  createPresignedUpload(key: string, contentType: string, expiresInSeconds?: number): Promise<PresignedUpload>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}
