"use client";

import { useFormContext } from "react-hook-form";
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
import { Sparkles, FileBox } from "lucide-react";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { CaptionDialog } from "./caption-dialog";
import { OptimizingState } from "./types";

export function StepReview({
  photoUrls,
  optimizing,
  selectedCaptionPlatform,
  onSelectCaptionPlatform,
  onGenerateCaption,
  captionDialogOpen,
  onCaptionDialogOpenChange,
  captionPreview,
  onApplyCaption,
  templateName,
  onTemplateNameChange,
  onSaveTemplate,
}: {
  photoUrls: string[];
  optimizing: OptimizingState;
  selectedCaptionPlatform: string;
  onSelectCaptionPlatform: (platform: string) => void;
  onGenerateCaption: () => void;
  captionDialogOpen: boolean;
  onCaptionDialogOpenChange: (open: boolean) => void;
  captionPreview: { title: string; description: string } | null;
  onApplyCaption: () => void;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  onSaveTemplate: () => void;
}) {
  const { watch, getValues } = useFormContext<ListingFormData>();
  const title = watch("title");
  const description = watch("description");
  const price = watch("price");
  const validPhotos = photoUrls.filter((u) => u.trim().startsWith("http") || u.trim().startsWith("data:"));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="text-sm font-medium">Summary</p>
        <div className="flex gap-4">
          {validPhotos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={validPhotos[0]} alt="" className="h-20 w-20 rounded-md object-cover" />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="line-clamp-1 font-medium">{title || "Untitled listing"}</p>
            <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
            <p className="text-sm font-semibold text-primary">${Number(price || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {validPhotos.length} photo{validPhotos.length === 1 ? "" : "s"} · {getValues("condition")} · {getValues("category")}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          Marketplace caption
        </div>
        <p className="text-xs text-muted-foreground">
          Generate a title/description tailored to a specific marketplace&apos;s tone.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedCaptionPlatform} onValueChange={(v) => onSelectCaptionPlatform(v ?? "")}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select marketplace..." />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.filter((p) => p.authType === "manual").map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onGenerateCaption}
            disabled={!!optimizing || !selectedCaptionPlatform || !title || !description}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {optimizing === "caption" ? "Writing..." : "Generate caption"}
          </Button>
        </div>
      </div>

      <div className="flex items-end gap-2 rounded-lg border p-3">
        <div className="flex-1 space-y-1">
          <Label htmlFor="templateName" className="text-xs">
            Save as template
          </Label>
          <Input
            id="templateName"
            value={templateName}
            onChange={(e) => onTemplateNameChange(e.target.value)}
            placeholder="Template name"
          />
        </div>
        <Button type="button" variant="secondary" onClick={onSaveTemplate} disabled={!templateName.trim()}>
          <FileBox className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>

      <CaptionDialog
        open={captionDialogOpen}
        onOpenChange={onCaptionDialogOpenChange}
        platform={selectedCaptionPlatform}
        preview={captionPreview}
        onApply={onApplyCaption}
      />
    </div>
  );
}
