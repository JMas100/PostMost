export interface RemovedBackground {
  /** PNG (or WebP) bytes of the cut-out image. */
  bytes: Buffer;
  contentType: string;
}

export interface BackgroundRemover {
  id: string;
  /** Whether the provider has the credentials it needs. */
  isConfigured(): boolean;
  /** Accepts an http(s) URL or a `data:` URL and returns the cut-out image bytes. */
  removeBackground(imageUrl: string): Promise<RemovedBackground>;
}
