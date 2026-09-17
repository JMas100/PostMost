"use client";

import { Controller, useFormContext } from "react-hook-form";
import { ListingFormData } from "@/lib/schemas/listing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tag, Megaphone } from "lucide-react";
import { OptimizingState } from "./types";

const conditions = ["New with tags", "New without tags", "Like new", "Good", "Fair", "Poor"];
const categories = ["Clothing", "Shoes", "Accessories", "Electronics", "Home", "Toys", "Sports", "Vintage", "Other"];
const audiences = ["Women", "Men", "Kids", "Unisex", "Pets"];
// Categories where audience is genuinely ambiguous from item type alone -- matches
// DIRECT_CATEGORY_MAP in lib/marketplaces/adapters/poshmark.ts, which maps the rest (Electronics/
// Home/Toys) straight across without needing this field at all.
const CATEGORIES_NEEDING_AUDIENCE = new Set(["Clothing", "Shoes", "Accessories", "Sports", "Vintage", "Other"]);

export function StepDetails({
  optimizing,
  onOptimizeTitle,
  onOptimizeDescription,
}: {
  optimizing: OptimizingState;
  onOptimizeTitle: () => void;
  onOptimizeDescription: () => void;
}) {
  const {
    register,
    control,
    getValues,
    watch,
    formState: { errors },
  } = useFormContext<ListingFormData>();

  const selectedCategory = watch("category");
  const audienceValue = watch("audience");
  const needsAudience = CATEGORIES_NEEDING_AUDIENCE.has(selectedCategory ?? "");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="title">Title</Label>
          <Button type="button" variant="outline" size="sm" onClick={onOptimizeTitle} disabled={!!optimizing || !getValues("title")}>
            <Tag className="mr-1 h-3 w-3" />
            {optimizing === "title" ? "Optimizing..." : "Optimize title"}
          </Button>
        </div>
        <Input id="title" {...register("title")} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Description</Label>
          <Button type="button" variant="outline" size="sm" onClick={onOptimizeDescription} disabled={!!optimizing || !getValues("description")}>
            <Megaphone className="mr-1 h-3 w-3" />
            {optimizing === "description" ? "Optimizing..." : "Optimize description"}
          </Button>
        </div>
        <Textarea id="description" rows={5} {...register("description")} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="condition">Condition</Label>
          <Controller
            control={control}
            name="condition"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                <SelectTrigger id="condition" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {needsAudience && (
        <div className="space-y-2">
          <Label htmlFor="audience">Who&apos;s it for?</Label>
          <Controller
            control={control}
            name="audience"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || null)}>
                <SelectTrigger id="audience" className="w-full">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {audiences.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {!audienceValue && (
            <p className="text-sm text-muted-foreground">
              Some marketplaces (like Poshmark) require this to categorize the listing correctly.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" {...register("brand")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="size">Size</Label>
          <Input id="size" {...register("size")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <Input id="color" {...register("color")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="material">Material</Label>
          <Input id="material" {...register("material")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" {...register("sku")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <Input id="tags" {...register("tags")} placeholder="vintage, denim, jacket" />
      </div>
    </div>
  );
}
