"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTemplate, deleteTemplate } from "@/lib/actions/templates";
import { ListingFormData } from "@/lib/schemas/listing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformLogo } from "@/components/platform-logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

// Same literal lists step-details.tsx and lib/ai/generate-listing.ts already use -- matching
// existing project convention (small, stable, un-shared constants) rather than introducing a
// shared file for two arrays that already exist independently in two other places.
const CONDITIONS = ["New with tags", "New without tags", "Like new", "Good", "Fair", "Poor"];
const CATEGORIES = ["Clothing", "Shoes", "Accessories", "Electronics", "Home", "Toys", "Sports", "Vintage", "Other"];
const NO_SHIPPING_PROFILE = "__none__";

interface TemplateEditFormProps {
  template: { id: string; name: string; payload: string; platforms: string | null };
  shippingProfiles: { id: string; name: string }[];
  platforms: { id: string; name: string }[];
}

export function TemplateEditForm({ template, shippingProfiles, platforms }: TemplateEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  let initialPayload: Partial<ListingFormData> = {};
  try {
    initialPayload = JSON.parse(template.payload) as Partial<ListingFormData>;
  } catch {
    // Corrupt/legacy payload -- start from a blank form rather than failing to render.
  }
  let initialPlatforms: string[] = [];
  try {
    initialPlatforms = template.platforms ? (JSON.parse(template.platforms) as string[]) : [];
  } catch {
    initialPlatforms = [];
  }

  const [name, setName] = useState(template.name);
  const [fields, setFields] = useState<Partial<ListingFormData>>(initialPayload);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set(initialPlatforms));

  function setField<K extends keyof ListingFormData>(key: K, value: Partial<ListingFormData>[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateTemplate(template.id, name.trim() || "Untitled template", fields, Array.from(selectedPlatforms));
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Template updated");
      router.push("/templates");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTemplate(template.id);
      toast.success("Template deleted");
      router.push("/templates");
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Template name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title pattern</Label>
            <Input id="title" value={fields.title ?? ""} onChange={(e) => setField("title", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} value={fields.description ?? ""} onChange={(e) => setField("description", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select value={fields.condition ?? ""} onValueChange={(v) => setField("condition", v ?? "")}>
                <SelectTrigger id="condition" className="w-full">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={fields.category ?? ""} onValueChange={(v) => setField("category", v ?? "")}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" value={fields.brand ?? ""} onChange={(e) => setField("brand", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Input id="size" value={fields.size ?? ""} onChange={(e) => setField("size", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input id="color" value={fields.color ?? ""} onChange={(e) => setField("color", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Input id="material" value={fields.material ?? ""} onChange={(e) => setField("material", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={fields.sku ?? ""} onChange={(e) => setField("sku", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (USD)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={fields.price ?? ""}
                onChange={(e) => setField("price", e.target.value === "" ? undefined : Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost (USD)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={fields.cost ?? ""}
                onChange={(e) => setField("cost", e.target.value === "" ? null : Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={fields.quantity ?? ""}
                onChange={(e) => setField("quantity", e.target.value === "" ? undefined : Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input id="tags" value={fields.tags ?? ""} onChange={(e) => setField("tags", e.target.value)} />
          </div>

          {shippingProfiles.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="shippingProfileId">Shipping profile</Label>
              <Select
                value={fields.shippingProfileId || NO_SHIPPING_PROFILE}
                onValueChange={(v) => setField("shippingProfileId", v === NO_SHIPPING_PROFILE ? null : v)}
              >
                <SelectTrigger id="shippingProfileId" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SHIPPING_PROFILE}>None</SelectItem>
                  {shippingProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div>
            <Label>Marketplaces</Label>
            <p className="text-sm text-muted-foreground">
              Pre-select these when a listing is composed from this template. Leave none checked to fall back to whatever&apos;s connected.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {platforms.map((platform) => (
              <label
                key={platform.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
              >
                <Checkbox checked={selectedPlatforms.has(platform.id)} onCheckedChange={() => togglePlatform(platform.id)} />
                <PlatformLogo platform={platform.id} size={18} />
                <span className="truncate">{platform.name}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete template
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/templates")} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
