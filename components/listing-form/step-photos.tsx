"use client";

import { useFormContext } from "react-hook-form";
import { RefObject } from "react";
import { ListingFormData } from "@/lib/schemas/listing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { PhotoSortableGrid } from "./photo-sortable-grid";
import { OptimizingState } from "./types";

const NO_TEMPLATE = "__none__";

export function StepPhotos({
  fileInputRef,
  photoUrls,
  setPhotoUrls,
  uploading,
  analyzing,
  optimizing,
  onFileChange,
  onAddPhotoField,
  onUpdatePhoto,
  onRemovePhoto,
  onAnalyzeWithAI,
  onEnhancePhoto,
  enhancingUrl,
  templates,
  selectedTemplate,
  onSelectTemplate,
  onSkipToNext,
}: {
  fileInputRef: RefObject<HTMLInputElement>;
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
  onEnhancePhoto: (index: number) => void;
  enhancingUrl: string | null;
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

  const validPhotos = photoUrls.filter((u) => u.trim().startsWith("http") || u.trim().startsWith("data:"));

  function handleReorder(nextOrder: string[]) {
    const placeholders = photoUrls.filter((u) => !validPhotos.includes(u));
    setPhotoUrls([...nextOrder, ...placeholders]);
  }

  function handleRemoveByUrl(url: string) {
    const index = photoUrls.indexOf(url);
    if (index !== -1) onRemovePhoto(index);
  }

  function handleEnhanceByUrl(url: string) {
    const index = photoUrls.indexOf(url);
    if (index !== -1) onEnhancePhoto(index);
  }

  return (
    <div className="space-y-6">
      {templates.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="template">Start from template</Label>
          <Select
            value={selectedTemplate || NO_TEMPLATE}
            onValueChange={(v) => onSelectTemplate(!v || v === NO_TEMPLATE ? "" : v)}
          >
            <SelectTrigger id="template" className="w-full">
              <SelectValue placeholder="— No template —" />
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
        </div>
      )}

      <div className="space-y-3">
        <div>
          <Label htmlFor="photos">Photos</Label>
          <p className="text-xs text-muted-foreground">
            {uploading
              ? "Uploading photos to cloud storage..."
              : "Photos are uploaded to cloud storage (up to 10 MB each). Or paste image URLs below."}
          </p>
        </div>
        <Input
          id="photos"
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          onChange={onFileChange}
          disabled={uploading}
          className="cursor-pointer"
        />

        <PhotoSortableGrid
          photos={validPhotos}
          onReorder={handleReorder}
          onRemove={handleRemoveByUrl}
          onEnhance={handleEnhanceByUrl}
          enhancingUrl={enhancingUrl}
          disabled={!!optimizing}
        />

        {photoUrls.map(
          (url, index) =>
            !url.startsWith("data:") && (
              <Input
                key={index}
                value={url}
                onChange={(e) => onUpdatePhoto(index, e.target.value)}
                placeholder="https://example.com/photo.jpg"
              />
            )
        )}

        <Button type="button" variant="outline" size="sm" onClick={onAddPhotoField}>
          Add photo URL
        </Button>

        {errors.photos && <p className="text-sm text-destructive">{errors.photos.message}</p>}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Let AI build your listing</p>
            <p className="text-xs text-muted-foreground">
              We&apos;ll generate a title, description, price, and details from your photo.
            </p>
          </div>
          <Button
            type="button"
            onClick={onAnalyzeWithAI}
            disabled={analyzing || uploading || watchedPhotos.length === 0 || !!optimizing}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {analyzing ? "Analyzing..." : "Generate with AI"}
          </Button>
        </div>
        <button type="button" onClick={onSkipToNext} className="mt-3 text-xs text-muted-foreground underline">
          Skip AI, enter details manually
        </button>
      </div>
    </div>
  );
}
