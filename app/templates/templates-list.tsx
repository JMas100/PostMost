"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { deleteTemplate } from "@/lib/actions/templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PlatformLogo } from "@/components/platform-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Pencil, MoreVertical } from "lucide-react";
import type { ListingFormData } from "@/lib/schemas/listing";

interface TemplatesListProps {
  templates: {
    id: string;
    name: string;
    payload: string;
    platforms: string | null;
    usageCount: number;
    lastUsedAt: Date | null;
    createdAt: Date;
  }[];
  shippingProfiles: { id: string; name: string }[];
}

function attributeChip(label: string, value?: string | null) {
  if (!value) return null;
  return (
    <span key={label} className="rounded-md border bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
      {label}: {value}
    </span>
  );
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
        secondaryAction={{ label: "Save from a listing", href: "/listings" }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => {
        let payload: Partial<ListingFormData> = {};
        try {
          payload = JSON.parse(template.payload) as Partial<ListingFormData>;
        } catch {
          // fall through with an empty payload -- card below handles missing fields honestly
        }
        let platforms: string[] = [];
        try {
          platforms = template.platforms ? (JSON.parse(template.platforms) as string[]) : [];
        } catch {
          // malformed platforms JSON -- fall back to "no preference" rather than crash the card
        }
        const filledCount = SUBSTANTIAL_FIELDS.filter((f) => payload[f]).length;
        const neverUsed = template.usageCount === 0;
        const needsFinishing = neverUsed && filledCount <= 2;

        return (
          <Card key={template.id} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground" aria-label={`More actions for ${template.name}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await deleteTemplate(template.id);
                          router.refresh();
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <span className="text-xs text-muted-foreground">
                {neverUsed
                  ? `Never used · created ${formatDistanceToNow(template.createdAt, { addSuffix: true })}`
                  : `Used ${template.usageCount} time${template.usageCount === 1 ? "" : "s"}${
                      template.lastUsedAt ? ` · last used ${formatDistanceToNow(template.lastUsedAt, { addSuffix: true })}` : ""
                    }`}
              </span>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-3">
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

              <div className="flex flex-wrap gap-1.5">
                {attributeChip("Category", payload.category)}
                {attributeChip("Condition", payload.condition)}
                {attributeChip("Brand", payload.brand)}
                {attributeChip("Shipping", profileName(payload.shippingProfileId))}
                {payload.price ? (
                  attributeChip("Price", `$${Number(payload.price).toFixed(2)}`)
                ) : (
                  <span className="rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground">Price not set</span>
                )}
              </div>

              {platforms.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {platforms.map((p) => (
                    <PlatformLogo key={p} platform={p} size={20} onDark showLabel={false} />
                  ))}
                  <span className="text-xs text-muted-foreground">posts to {platforms.length}</span>
                </div>
              )}

              {needsFinishing && (
                <div className="rounded-md border border-dashed p-2.5 text-xs text-warning">
                  Holds {filledCount} field{filledCount === 1 ? "" : "s"}. Templates get useful past four or five — add a title pattern and a
                  condition.
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1 mt-auto">
                <Button size="sm" onClick={() => router.push(`/listings/new?templateId=${template.id}`)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {needsFinishing ? "Finish it" : "Use template"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => router.push(`/templates/${template.id}/edit`)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
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
