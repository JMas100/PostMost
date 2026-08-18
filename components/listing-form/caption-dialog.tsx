"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PLATFORMS } from "@/lib/marketplaces/platforms";

export function CaptionDialog({
  open,
  onOpenChange,
  platform,
  preview,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: string;
  preview: { title: string; description: string } | null;
  onApply: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generated {PLATFORMS.find((p) => p.id === platform)?.name || "marketplace"} caption</DialogTitle>
        </DialogHeader>
        {preview && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Title</Label>
              <p className="text-sm font-medium">{preview.title}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="whitespace-pre-wrap text-sm">{preview.description}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={onApply}>
                Apply caption
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
