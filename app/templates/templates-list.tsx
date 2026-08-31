"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { deleteTemplate } from "@/lib/actions/templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Trash2 } from "lucide-react";
import type { ListingFormData } from "@/lib/schemas/listing";

interface TemplatesListProps {
  templates: { id: string; name: string; payload: string; usageCount: number; lastUsedAt: Date | null; createdAt: Date }[];
  shippingProfiles: { id: string; name: string }[];
}

/** Fields that make a template worth reaching for -- past four or five, "add a title pattern and
 *  a condition" per the design's own reasoning. Mirrors the composer's required-vs-attribute
 *  split loosely, but counts anything meaningful rather than re-deriving the exact schema rule. */
const SUBSTANTIAL_FIELDS: (keyof ListingFormData)[] = ["title", "description", "condition", "category", "brand", "shippingProfileId"];

export function TemplatesList({ templates, shippingProfiles }: TemplatesListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const profileName = (id: string | null | undefined) => shippingProfiles.find((p) => p.id === id)?.name;

  if (templates.length === 0) {
    return (
      <EmptyState
        variant="first-run"
        headline="No templates yet"
        body="If you list similar things repeatedly, save one listing's wording, category and shipping as a template and the next one starts half-written."
        primaryAction={{ label: "Create a template", href: "/listings/new" }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {templates.map((template) => {
        let payload: Partial<ListingFormData> = {};
        try {
          payload = JSON.parse(template.payload) as Partial<ListingFormData>;
        } catch {
          // fall through with an empty payload -- card below handles missing fields honestly
        }
        const filledCount = SUBSTANTIAL_FIELDS.filter((f) => payload[f]).length;
        const neverUsed = template.usageCount === 0;
        const needsFinishing = neverUsed && filledCount <= 2;

        return (
          <Card key={template.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {neverUsed
                    ? `Never used · created ${formatDistanceToNow(template.createdAt, { addSuffix: true })}`
                    : `Used ${template.usageCount} time${template.usageCount === 1 ? "" : "s"}${
                        template.lastUsedAt ? ` · last used ${formatDistanceToNow(template.lastUsedAt, { addSuffix: true })}` : ""
                      }`}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Title pattern</p>
                <p className="text-sm">
                  {payload.title || <span className="text-muted-foreground">Not set — the composer keeps whatever you type</span>}
                </p>
              </div>
              {payload.description && (
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Description</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{payload.description}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {payload.category && <span>Category: {payload.category}</span>}
                {payload.condition && <span>Condition: {payload.condition}</span>}
                {payload.brand && <span>Brand: {payload.brand}</span>}
                {profileName(payload.shippingProfileId) && <span>Shipping: {profileName(payload.shippingProfileId)}</span>}
                <span>{payload.price ? `$${Number(payload.price).toFixed(2)}` : "Price not set"}</span>
              </div>

              {needsFinishing && (
                <p className="text-xs text-warning">
                  Holds {filledCount} field{filledCount === 1 ? "" : "s"}. Templates get useful past four or five — add a title pattern and a
                  condition.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button size="sm" onClick={() => router.push(`/listings/new?templateId=${template.id}`)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {needsFinishing ? "Finish it" : "Use template"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteTemplate(template.id);
                      router.refresh();
                    })
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                {needsFinishing && <Badge variant="outline">Unfinished</Badge>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
