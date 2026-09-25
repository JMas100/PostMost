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
import { sendToExtension } from "./send-to-extension";
import { ExtensionListingPayload } from "./types";

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
  automationRetired,
  extensionListing,
}: {
  listingId: string;
  platform: string;
  errorMessage: string | null;
  updatedAt: Date;
  currentFields: FieldValues;
  savedOverrides: string | null;
  /** Set for a platform whose server-side automation is retired (see
   *  ManualAdapterConfig.automationRetired) -- both actions below (Retry, Fix a field) call
   *  crossPost()/retryWithFieldOverrides(), which now always refuses for these platforms by
   *  design. A FAILED row here for one of them is the seller's own "Couldn't post this" report
   *  from the extension overlay (app/api/extension/sync/route.ts), not an automation failure --
   *  there's nothing here to retry automatically, so this renders a different, accurate card
   *  instead of automation-retry buttons that would just bounce off the same guard every time. */
  automationRetired: boolean;
  /** Only used when automationRetired -- lets this card send straight back to the extension
   *  (same mechanism the main Publish panel uses) without the seller having to find this
   *  platform to re-select, which they can't: a FAILED row is excluded from that panel's own
   *  list the same way any other attempted platform is (see alreadyAttempted in
   *  app/listings/[id]/page.tsx), so without this the platform would otherwise be stuck with no
   *  way to try it again at all. */
  extensionListing?: ExtensionListingPayload;
}) {
  const router = useRouter();
  const [sendingToExtension, setSendingToExtension] = useState(false);
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

  if (automationRetired) {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/5 p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <PlatformLogo platform={platform} size={16} onDark />
              <span className="text-sm font-medium">{platformName} didn&apos;t post</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {errorMessage || "Reported as failed from the marketplace page."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDistanceToNow(updatedAt, { addSuffix: true })}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {platformName} posts live through the browser extension.
            </p>
          </div>
        </div>
        {extensionListing && (
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={sendingToExtension}
              onClick={() => {
                setSendingToExtension(true);
                sendToExtension(extensionListing, [platform]);
                setSendingToExtension(false);
              }}
            >
              {sendingToExtension ? "Sending…" : `Try ${platformName} again`}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-warning/40 bg-warning/5 p-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <PlatformLogo platform={platform} size={16} onDark />
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
        <div className="mt-3 flex items-center gap-3">
          {/* One primary action, not two equal-weight buttons -- fixing a field is the more
              likely path to success than retrying the exact data that just failed, so it gets
              the visual weight. Plain retry stays reachable for a genuinely transient failure. */}
          <Button size="sm" className="flex-1" onClick={() => setEditing(true)} disabled={retrying}>
            Fix a field
          </Button>
          <button
            type="button"
            onClick={retry}
            disabled={retrying}
            className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {retrying ? "Retrying…" : "Retry"}
          </button>
        </div>
      )}
    </div>
  );
}
