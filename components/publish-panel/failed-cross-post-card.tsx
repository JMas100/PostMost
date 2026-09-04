"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, RotateCcw } from "lucide-react";
import { crossPost, retryWithFieldOverrides } from "@/lib/actions/crosspost";
import { PlatformLogo } from "@/components/platform-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPlatform } from "@/lib/marketplaces/platforms";

// Not real per-field error detection (no adapter reports which specific field a platform
// rejected -- PostResult.error is free text) -- these are just the fields platforms most often
// reject via a restrictive dropdown of their own, editable inline so a retry doesn't require
// leaving the page or touching the listing everywhere else it's already live.
interface FieldValues {
  size: string;
  category: string;
  condition: string;
  brand: string;
}

export function FailedCrossPostCard({
  listingId,
  platform,
  errorMessage,
  updatedAt,
  currentFields,
  savedOverrides,
}: {
  listingId: string;
  platform: string;
  errorMessage: string | null;
  updatedAt: Date;
  currentFields: FieldValues;
  savedOverrides: string | null;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [editing, setEditing] = useState(false);
  const platformName = getPlatform(platform)?.name ?? platform;

  let initialOverrides: Partial<FieldValues> = {};
  try {
    initialOverrides = savedOverrides ? JSON.parse(savedOverrides) : {};
  } catch {
    initialOverrides = {};
  }
  const [fields, setFields] = useState<FieldValues>({ ...currentFields, ...initialOverrides });

  function setField(key: keyof FieldValues, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function retry() {
    setRetrying(true);
    const result = await crossPost(listingId, [platform]);
    setRetrying(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Retrying ${platformName}`);
    }
    router.refresh();
  }

  async function saveAndRetry() {
    setRetrying(true);
    const result = await retryWithFieldOverrides(listingId, platform, fields);
    setRetrying(false);
    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Retrying ${platformName}`);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-warning/40 bg-warning/5 p-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <PlatformLogo platform={platform} size={16} />
            <span className="text-sm font-medium">{platformName} didn&apos;t post</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {errorMessage || "Failed for an unknown reason."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDistanceToNow(updatedAt, { addSuffix: true })}
          </p>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2 border-t border-warning/20 pt-3">
          <p className="text-xs text-muted-foreground">
            If {platformName} rejected one of these, fix it here and retry — nothing else about
            this listing changes.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`${platform}-size`} className="text-xs">Size</Label>
              <Input id={`${platform}-size`} className="h-8 text-sm" value={fields.size} onChange={(e) => setField("size", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${platform}-category`} className="text-xs">Category</Label>
              <Input id={`${platform}-category`} className="h-8 text-sm" value={fields.category} onChange={(e) => setField("category", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${platform}-condition`} className="text-xs">Condition</Label>
              <Input id={`${platform}-condition`} className="h-8 text-sm" value={fields.condition} onChange={(e) => setField("condition", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${platform}-brand`} className="text-xs">Brand</Label>
              <Input id={`${platform}-brand`} className="h-8 text-sm" value={fields.brand} onChange={(e) => setField("brand", e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(false)} disabled={retrying}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1" onClick={saveAndRetry} disabled={retrying}>
              {retrying ? "Retrying…" : `Save and retry ${platformName}`}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(true)} disabled={retrying}>
            Fix a field
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={retry} disabled={retrying}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {retrying ? "Retrying…" : "Retry"}
          </Button>
        </div>
      )}
    </div>
  );
}
