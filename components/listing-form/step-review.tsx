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
import { Sparkles, FileBox, ChevronDown } from "lucide-react";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { PlatformLogo } from "@/components/platform-logo";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
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
  connectedPlatforms,
  selectedPlatforms,
  onTogglePlatform,
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
  connectedPlatforms: string[];
  selectedPlatforms: Set<string>;
  onTogglePlatform: (platform: string) => void;
}) {
  const { watch, getValues } = useFormContext<ListingFormData>();
  const title = watch("title");
  const description = watch("description");
  const price = watch("price");
  const validPhotos = photoUrls.filter((u) => u.trim().startsWith("http") || u.trim().startsWith("data:"));
  const unconnectedCount = PLATFORMS.filter((p) => p.authType !== "none" && !connectedPlatforms.includes(p.id)).length;

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
        <div>
          <p className="text-sm font-medium">Where should this go?</p>
          <p className="text-xs text-muted-foreground">
            {connectedPlatforms.length > 0
              ? "Everything is ready. Pick the marketplaces and publish."
              : "Connect a marketplace to publish immediately, or save as a draft for now."}
          </p>
        </div>
        {connectedPlatforms.length > 0 && (
          <div className="space-y-1">
            {connectedPlatforms.map((platform) => {
              const info = PLATFORMS.find((p) => p.id === platform);
              return (
                <label
                  key={platform}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-md border p-2.5 hover:bg-muted"
                >
                  <div className="flex items-center gap-2.5">
                    <Checkbox checked={selectedPlatforms.has(platform)} onCheckedChange={() => onTogglePlatform(platform)} />
                    <PlatformLogo platform={platform} size={22} />
                    <span className="text-sm font-medium">{info?.name ?? platform}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">${Number(price || 0).toFixed(2)}</span>
                </label>
              );
            })}
          </div>
        )}
        {unconnectedCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {unconnectedCount} more marketplace{unconnectedCount === 1 ? "" : "s"} available.{" "}
            <Link href="/marketplaces" className="text-primary hover:underline">
              Connect
            </Link>
          </p>
        )}
      </div>

      <details className="group rounded-lg border p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
          More options
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 space-y-4">
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
        </div>
      </details>

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
