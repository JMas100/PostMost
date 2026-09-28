"use client";

import { useEffect, useRef } from "react";
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
import { Tag, Megaphone, AlertTriangle } from "lucide-react";
import { OptimizingState } from "./types";
import { CATEGORIES, subcategoriesFor, childrenFor } from "@/lib/category-taxonomy";

const conditions = ["New with tags", "New without tags", "Like new", "Good", "Fair", "Poor"];
const audiences = ["Women", "Men", "Kids", "Unisex", "Pets"];
// Categories where audience is genuinely ambiguous from item type alone -- matches
// DIRECT_CATEGORY_MAP in lib/marketplaces/adapters/poshmark-validation.ts, which maps the rest
// (Electronics/Home & Garden/Baby & Kids) straight across without needing this field at all.
const CATEGORIES_NEEDING_AUDIENCE = new Set([
  "Clothing, Shoes, & Accessories",
  "Sports & Outdoors",
  "Collectibles & Vintage",
  "Toys, Games, & Hobbies",
  "Other",
]);
// Subcategories that already say who the item is for -- picking one auto-fills "Who's it for?"
// instead of asking again, though it stays fully overridable.
const AUDIENCE_BY_SUBCATEGORY: Record<string, string> = {
  "Women's Clothing": "Women",
  "Men's Clothing": "Men",
  "Women's Shoes": "Women",
  "Men's Shoes": "Men",
};

export function StepDetails({
  optimizing,
  onOptimizeTitle,
  onOptimizeDescription,
  requiredFieldNotice,
  onRequiredFieldResolved,
}: {
  optimizing: OptimizingState;
  onOptimizeTitle: () => void;
  onOptimizeDescription: () => void;
  /** Set when a hard-blocked publish attempt sent the user back to this exact step -- shows the
   *  real reason as a prominent, hard-to-miss notice instead of the normal quiet hint. */
  requiredFieldNotice?: string | null;
  onRequiredFieldResolved?: () => void;
}) {
  const {
    register,
    control,
    getValues,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useFormContext<ListingFormData>();

  const selectedCategory = watch("category");
  const selectedSubcategory = watch("categoryDetail");
  const categoryPath = watch("categoryPath") ?? [];
  const audienceValue = watch("audience");
  const needsAudience = CATEGORIES_NEEDING_AUDIENCE.has(selectedCategory ?? "");
  const subcategoryOptions = subcategoriesFor(selectedCategory);

  useEffect(() => {
    if (audienceValue) onRequiredFieldResolved?.();
  }, [audienceValue, onRequiredFieldResolved]);

  // Clears a stale subcategory (and anything deeper) left over from a previous category -- only
  // on an actual change after mount, so this doesn't wipe out an existing listing's picks on
  // first render.
  const prevCategoryRef = useRef(selectedCategory);
  useEffect(() => {
    if (prevCategoryRef.current !== selectedCategory) {
      setValue("categoryDetail", "", { shouldValidate: true });
      setValue("categoryPath", [], { shouldValidate: true });
      prevCategoryRef.current = selectedCategory;
    }
  }, [selectedCategory, setValue]);

  // Same idea one level down: picking a different Subcategory invalidates anything deeper that
  // was chosen under the old one.
  const prevSubcategoryRef = useRef(selectedSubcategory);
  useEffect(() => {
    if (prevSubcategoryRef.current !== selectedSubcategory) {
      setValue("categoryPath", [], { shouldValidate: true });
      prevSubcategoryRef.current = selectedSubcategory;
    }
  }, [selectedSubcategory, setValue]);

  // Builds one optional Select per level below Subcategory, for as long as the taxonomy actually
  // has further children and the seller keeps choosing to go deeper -- never mandatory, and the
  // chain stops the moment a level's pick has no children of its own (a real leaf) or hasn't been
  // picked yet.
  const deeperLevels: { depth: number; pathPrefix: string[]; options: string[]; value: string }[] = [];
  {
    let prefix = [selectedCategory, selectedSubcategory].filter((v): v is string => Boolean(v));
    for (let depth = 0; prefix.length >= 2; depth++) {
      const options = childrenFor(prefix);
      if (options.length === 0) break;
      const value = categoryPath[depth] ?? "";
      deeperLevels.push({ depth, pathPrefix: prefix, options, value });
      if (!value) break;
      prefix = [...prefix, value];
    }
  }

  function pickDeeperLevel(depth: number, value: string) {
    const next = categoryPath.slice(0, depth);
    if (value) next.push(value);
    setValue("categoryPath", next, { shouldValidate: true });
  }

  // Some subcategories already say who the item is for -- auto-fill "Who's it for?" instead of
  // asking again, but never override a value the seller already picked themselves.
  useEffect(() => {
    const suggested = AUDIENCE_BY_SUBCATEGORY[selectedSubcategory ?? ""];
    if (suggested && !dirtyFields.audience) {
      setValue("audience", suggested, { shouldValidate: true });
    }
  }, [selectedSubcategory, dirtyFields.audience, setValue]);

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
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  {field.value && !CATEGORIES.includes(field.value) && (
                    <SelectItem value={field.value}>{field.value} (legacy)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoryDetail">Subcategory</Label>
        <Controller
          control={control}
          name="categoryDetail"
          render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || "")}>
              <SelectTrigger id="categoryDetail" className="w-full">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {subcategoryOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
                {field.value && !subcategoryOptions.includes(field.value) && (
                  <SelectItem value={field.value}>{field.value} (legacy)</SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-sm text-muted-foreground">
          Used to auto-select the right subcategory on marketplaces that need one (like Facebook and OfferUp).
        </p>
      </div>

      {deeperLevels.map(({ depth, options, value }) => (
        <div className="space-y-2" key={depth}>
          <Label htmlFor={`categoryPath-${depth}`}>Get more specific (optional)</Label>
          <Select value={value} onValueChange={(v) => pickDeeperLevel(depth, v || "")}>
            <SelectTrigger id={`categoryPath-${depth}`} className="w-full">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      {needsAudience && (
        <div className="space-y-2">
          {requiredFieldNotice && (
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{requiredFieldNotice}</span>
            </div>
          )}
          <Label htmlFor="audience">Who&apos;s it for?</Label>
          <Controller
            control={control}
            name="audience"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || null)}>
                <SelectTrigger id="audience" className={requiredFieldNotice ? "w-full border-warning" : "w-full"}>
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
          {!audienceValue && !requiredFieldNotice && (
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
