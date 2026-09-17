"use client";

import { useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { RefObject } from "react";
import { ListingFormData } from "@/lib/schemas/listing";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, ImageIcon, Link2, Sparkles, UploadCloud } from "lucide-react";
import { PhotoSortableGrid } from "./photo-sortable-grid";
import { isPhotoUrl, OptimizingState } from "./types";
import { BgRemovalTier } from "@/lib/plans";
import { getPlatform } from "@/lib/marketplaces/platforms";
import { DEFAULT_PHOTO_PRESET, PHOTO_PRESETS, PhotoBackground } from "@/lib/images/presets";
import { cn } from "@/lib/utils";

const NO_TEMPLATE = "__none__";
const MAX_PHOTOS = 24;

export function StepPhotos({
  fileInputRef,
  photoUrls,
  setPhotoUrls,
  uploading,
  analyzing,
  optimizing,
  onFileChange,
  onRemovePhoto,
  onAnalyzeWithAI,
  onEnhancePhoto,
  onEnhanceAllPhotos,
  onFormatAllPhotos,
  background,
  onBackgroundChange,
  preset,
  onPresetChange,
  enhancingUrls,
  batchProgress,
  studioAvailable,
  templates,
  selectedTemplate,
  onSelectTemplate,
  onSkipToNext,
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  photoUrls: string[];
  setPhotoUrls: (next: string[]) => void;
  uploading: boolean;
  analyzing: boolean;
  optimizing: OptimizingState;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddPhotoField: () => void;
  onUpdatePhoto: (index: number, value: string) => void;
  onRemovePhoto: (index: number) => void;
  onAnalyzeWithAI: () => void;
  onEnhancePhoto: (index: number, tier: BgRemovalTier) => void;
  onEnhanceAllPhotos: (tier: BgRemovalTier) => void;
  onFormatAllPhotos: () => void;
  background: PhotoBackground;
  onBackgroundChange: (value: PhotoBackground) => void;
  preset: string;
  onPresetChange: (value: string) => void;
  enhancingUrls: string[];
  batchProgress: { label: string; done: number; total: number } | null;
  studioAvailable: boolean;
  templates: { id: string; name: string; payload: string }[];
  selectedTemplate: string;
  onSelectTemplate: (id: string) => void;
  onSkipToNext: () => void;
}) {
  const {
    watch,
    formState: { errors },
  } = useFormContext<ListingFormData>();
  const watchedPhotos = watch("photos");

  const validPhotos = photoUrls.filter(isPhotoUrl);
  const hasPhotos = validPhotos.length > 0;
  const canWriteForMe = watchedPhotos.length > 0 && !analyzing && !uploading && !optimizing;

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  // Three separate triggers (empty-state dropzone, empty-state mobile text link, with-photos
  // toolbar) render at once at every viewport -- only one is visible at a given width via CSS,
  // but they still all exist in the DOM. A single shared `open` boolean opens all three
  // simultaneously, including the ones whose trigger is display:none, which then position
  // themselves nowhere sensible. Independent state per trigger keeps only the clicked one open.
  const [linkOpenDesktop, setLinkOpenDesktop] = useState(false);
  const [linkOpenMobile, setLinkOpenMobile] = useState(false);
  const [linkOpenToolbar, setLinkOpenToolbar] = useState(false);
  const [linkText, setLinkText] = useState("");

  function handleReorder(nextOrder: string[]) {
    const placeholders = photoUrls.filter((u) => !validPhotos.includes(u));
    setPhotoUrls([...nextOrder, ...placeholders]);
  }

  function handleRemoveByUrl(url: string) {
    const index = photoUrls.indexOf(url);
    if (index !== -1) onRemovePhoto(index);
  }

  function handleEnhanceByUrl(url: string, tier: BgRemovalTier) {
    const index = photoUrls.indexOf(url);
    if (index !== -1) onEnhancePhoto(index, tier);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      onFileChange({ target: { files: e.dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  }

  const linkUrls = linkText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  function closeAllLinkPopovers() {
    setLinkOpenDesktop(false);
    setLinkOpenMobile(false);
    setLinkOpenToolbar(false);
  }

  function addLinks() {
    if (linkUrls.length === 0) return;
    setPhotoUrls([...photoUrls.filter((u) => u.trim() !== ""), ...linkUrls]);
    setLinkText("");
    closeAllLinkPopovers();
  }

  // "Clean up" is the cutout (onEnhanceAllPhotos) and the resize/pad (onFormatAllPhotos)
  // presented as one action -- they were always two separate handlers, this just composes them
  // at the call site rather than asking the seller to know they're different operations.
  async function handleCleanUp() {
    await onEnhanceAllPhotos("standard");
    onFormatAllPhotos();
  }

  function renderLinkPopoverBody() {
    return (
      <div className="w-80 space-y-3">
        <div>
          <p className="text-sm font-semibold">Paste image links</p>
          <p className="mt-1 text-xs text-muted-foreground">
            One per line. We copy each image into your storage so the listing doesn&apos;t break if the original moves.
          </p>
        </div>
        <Textarea
          value={linkText}
          onChange={(e) => setLinkText(e.target.value)}
          placeholder={"https://example.com/photo-1.jpg\nhttps://example.com/photo-2.jpg"}
          className="min-h-24 font-mono text-xs"
          autoFocus
        />
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" className="flex-1" onClick={addLinks} disabled={linkUrls.length === 0}>
            Add {linkUrls.length > 0 ? linkUrls.length : ""} photo{linkUrls.length === 1 ? "" : "s"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={closeAllLinkPopovers}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real file inputs stay hidden behind styled triggers -- native file-input chrome is the
          one unstyled control in the product, and it can't accept a drop. */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onFileChange} className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} className="hidden" />

      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Add your photos</h3>
          <p className="text-sm text-muted-foreground">
            {hasPhotos ? "Drag to reorder. The first is the cover." : "Everything else on this listing can come from them."}
          </p>
        </div>
        {templates.length > 0 && !hasPhotos && (
          <Select value={selectedTemplate || NO_TEMPLATE} onValueChange={(v) => onSelectTemplate(!v || v === NO_TEMPLATE ? "" : v)}>
            <SelectTrigger className="h-8 w-auto gap-1.5 border-none px-0 text-xs text-muted-foreground underline underline-offset-2 shadow-none hover:text-foreground">
              <SelectValue placeholder="Start from a template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TEMPLATE}>— No template —</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!hasPhotos && (
        <>
          {/* Desktop: one dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "hidden flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-11 text-center transition-colors sm:flex",
              dragOver ? "border-primary bg-primary/5" : "bg-muted/30"
            )}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border bg-background text-muted-foreground">
              <UploadCloud className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Drop photos here</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                JPG, PNG or HEIC, up to 10 MB each. The first one becomes the cover on every marketplace.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" size="marketing" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <UploadCloud className="h-4 w-4" />
                {uploading ? "Uploading…" : "Choose photos"}
              </Button>
              <Popover open={linkOpenDesktop} onOpenChange={setLinkOpenDesktop}>
                <PopoverTrigger render={<Button type="button" variant="outline" size="marketing" />}>Paste a link</PopoverTrigger>
                <PopoverContent className="p-4">{renderLinkPopoverBody()}</PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Mobile: camera-first -- the common case (photographing an item in hand) a dropzone
              can't serve at all. */}
          <div className="grid grid-cols-2 gap-3 sm:hidden">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground"
            >
              <Camera className="h-6 w-6" />
              <span className="text-sm font-semibold">Take a photo</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border"
            >
              <ImageIcon className="h-6 w-6" />
              <span className="text-sm font-semibold">Camera roll</span>
            </button>
          </div>
          <Popover open={linkOpenMobile} onOpenChange={setLinkOpenMobile}>
            <PopoverTrigger
              render={<button type="button" className="block w-full text-center text-sm font-medium text-muted-foreground sm:hidden" />}
            >
              Paste a link instead
            </PopoverTrigger>
            <PopoverContent className="p-4">{renderLinkPopoverBody()}</PopoverContent>
          </Popover>

          <div className="rounded-lg border bg-muted/30 p-4 opacity-60">
            <p className="text-sm font-medium">Write the listing for me</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add a photo first and this fills in title, description, category and price.
            </p>
          </div>
        </>
      )}

      {hasPhotos && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {validPhotos.length} of {MAX_PHOTOS}
            </p>
            <div className="flex items-center gap-2">
              <Popover open={linkOpenToolbar} onOpenChange={setLinkOpenToolbar}>
                <PopoverTrigger render={<Button type="button" variant="outline" size="sm" />}>
                  <Link2 className="h-3.5 w-3.5" />
                  Paste a link
                </PopoverTrigger>
                <PopoverContent className="p-4">{renderLinkPopoverBody()}</PopoverContent>
              </Popover>
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                Add more
              </Button>
            </div>
          </div>

          <PhotoSortableGrid
            photos={validPhotos}
            onReorder={handleReorder}
            onRemove={handleRemoveByUrl}
            onEnhance={handleEnhanceByUrl}
            enhancingUrls={enhancingUrls}
            disabled={!!optimizing}
            studioAvailable={studioAvailable}
            onAddMore={() => fileInputRef.current?.click()}
            maxPhotos={MAX_PHOTOS}
          />
          <p className="text-xs text-muted-foreground">Hover a photo to cut out its background or remove it.</p>

          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Clean up all {validPhotos.length}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Cut out the backgrounds and size them for the marketplaces you sell on.
              </p>
              {batchProgress && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {batchProgress.label} {batchProgress.done}/{batchProgress.total}
                </p>
              )}
            </div>
            <div className="flex flex-none items-center gap-2">
              <Select value={background} onValueChange={(v) => onBackgroundChange(v as PhotoBackground)}>
                <SelectTrigger className="h-8 w-auto text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transparent">Transparent</SelectItem>
                  <SelectItem value="white">White</SelectItem>
                </SelectContent>
              </Select>
              <Select value={preset} onValueChange={(v) => onPresetChange(v || DEFAULT_PHOTO_PRESET)}>
                <SelectTrigger className="h-8 w-auto text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHOTO_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                      {p.platforms.length > 0 &&
                        ` — ${p.platforms
                          .map((id) => getPlatform(id)?.name ?? id)
                          .slice(0, 3)
                          .join(", ")}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={handleCleanUp} disabled={uploading || !!optimizing}>
                Clean up
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-primary bg-primary/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Write the listing for me</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Fills title, description, category, condition and a suggested price from these photos. You can edit everything after.
                </p>
              </div>
              <Button type="button" onClick={onAnalyzeWithAI} disabled={!canWriteForMe} className="flex-none">
                <Sparkles className="h-4 w-4" />
                {analyzing ? "Writing…" : "Write it for me"}
              </Button>
            </div>
          </div>

          {/* The step's one exit, two options -- the wizard's own generic Next is hidden on this
              step (see WizardNav's hideForward) so this and "Write it for me" above are the only
              two ways forward. */}
          <div className="flex justify-end border-t pt-4">
            <button type="button" onClick={onSkipToNext} className="text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground">
              I&apos;ll write it myself
            </button>
          </div>
        </>
      )}

      {errors.photos && <p className="text-sm text-destructive">{errors.photos.message}</p>}
    </div>
  );
}
