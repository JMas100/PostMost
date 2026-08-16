"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { listingSchema, ListingFormData } from "@/lib/schemas/listing";
import { createListing, saveDraft, publishDraft } from "@/lib/actions/listings";
import { saveTemplate } from "@/lib/actions/templates";
import { generateListingFromPhoto } from "@/lib/actions/ai-generate";
import {
  optimizeTitle,
  optimizeDescription,
  suggestPrice,
  generatePlatformCaption,
  enhancePhoto,
} from "@/lib/actions/ai-enhance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Sparkles, Trash2, FileBox, Save, Wand2, Image as ImageIcon, Tag, DollarSign, Megaphone } from "lucide-react";
import { PLATFORMS } from "@/lib/marketplaces/platforms";

const conditions = ["New with tags", "New without tags", "Like new", "Good", "Fair", "Poor"];
const categories = ["Clothing", "Shoes", "Accessories", "Electronics", "Home", "Toys", "Sports", "Vintage", "Other"];

interface ListingFormProps {
  mode?: "create" | "draft";
  draftId?: string;
  initialData?: Partial<ListingFormData>;
  templates?: { id: string; name: string; payload: string }[];
  defaultTemplateId?: string;
}

export function ListingForm({ mode = "create", draftId, initialData, templates = [], defaultTemplateId = "" }: ListingFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialData?.photos?.length ? initialData.photos : [""]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplateId);

  const [optimizing, setOptimizing] = useState<"" | "title" | "description" | "caption" | "price" | "photo">("");
  const [selectedCaptionPlatform, setSelectedCaptionPlatform] = useState<string>("");
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
  const [captionPreview, setCaptionPreview] = useState<{ title: string; description: string } | null>(null);

  const defaultValues: Partial<ListingFormData> = {
    condition: "Good",
    category: "Clothing",
    quantity: 1,
    photos: [],
    ...initialData,
  };

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues,
  });

  const watchedPhotos = watch("photos");

  useEffect(() => {
    const validPhotos = photoUrls.filter(
      (u) => u.trim().startsWith("http") || u.trim().startsWith("data:")
    );
    setValue("photos", validPhotos, { shouldValidate: true });
  }, [photoUrls, setValue]);

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (template) {
        try {
          const payload = JSON.parse(template.payload) as ListingFormData;
          reset({
            ...payload,
            photos: payload.photos || [],
          });
          setPhotoUrls(payload.photos?.length ? payload.photos : [""]);
          toast.success(`Loaded template: ${template.name}`);
        } catch {
          toast.error("Failed to load template");
        }
      }
    }
  }, [selectedTemplate, templates, reset]);

  function addPhotoField() {
    setPhotoUrls([...photoUrls, ""]);
  }

  function updatePhoto(index: number, value: string) {
    const next = [...photoUrls];
    next[index] = value;
    setPhotoUrls(next);
  }

  function removePhoto(index: number) {
    const next = photoUrls.filter((_, i) => i !== index);
    setPhotoUrls(next.length ? next : [""]);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;

    const readers = Array.from(files).map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((urls) => {
      setPhotoUrls((prev) => [...prev.filter((u) => u.trim() !== ""), ...urls]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  async function analyzeWithAI() {
    const firstImage = photoUrls.find(
      (u) => u.trim().startsWith("http") || u.trim().startsWith("data:")
    );
    if (!firstImage) {
      toast.error("Upload or paste a photo first");
      return;
    }

    setAnalyzing(true);
    try {
      const result = await generateListingFromPhoto(firstImage);
      if (!result.success || !result.listing) {
        toast.error(result.error || "AI analysis failed");
        return;
      }
      const l = result.listing;
      setValue("title", l.title, { shouldValidate: true });
      setValue("description", l.description, { shouldValidate: true });
      setValue("price", l.price, { shouldValidate: true });
      setValue("quantity", l.quantity, { shouldValidate: true });
      setValue("condition", l.condition, { shouldValidate: true });
      setValue("category", l.category, { shouldValidate: true });
      if (l.brand) setValue("brand", l.brand);
      if (l.size) setValue("size", l.size);
      if (l.color) setValue("color", l.color);
      if (l.material) setValue("material", l.material);
      toast.success("Listing fields filled from photo");
    } catch (err) {
      toast.error("Failed to analyze image");
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleOptimizeTitle() {
    const title = getValues("title");
    const category = getValues("category");
    if (!title) return toast.error("Add a title first");
    setOptimizing("title");
    try {
      const result = await optimizeTitle({ title, category });
      if (!result.success) {
        toast.error(result.error || "Optimization failed");
        return;
      }
      setValue("title", result.result, { shouldValidate: true });
      toast.success("Title optimized");
    } finally {
      setOptimizing("");
    }
  }

  async function handleOptimizeDescription() {
    const description = getValues("description");
    const category = getValues("category");
    if (!description) return toast.error("Add a description first");
    setOptimizing("description");
    try {
      const result = await optimizeDescription({ description, category });
      if (!result.success) {
        toast.error(result.error || "Optimization failed");
        return;
      }
      setValue("description", result.result, { shouldValidate: true });
      toast.success("Description optimized");
    } finally {
      setOptimizing("");
    }
  }

  async function handleSuggestPrice() {
    const firstImage = photoUrls.find((u) => u.startsWith("http") || u.startsWith("data:"));
    const title = getValues("title");
    const category = getValues("category");
    const condition = getValues("condition");
    if (!title) return toast.error("Add a title first");
    setOptimizing("price");
    try {
      const result = await suggestPrice({ imageBase64: firstImage, title, category, condition });
      if (!result.success) {
        toast.error(result.error || "Pricing suggestion failed");
        return;
      }
      setValue("price", result.result.price, { shouldValidate: true });
      toast.success(`Suggested price: $${result.result.price.toFixed(2)}`);
    } finally {
      setOptimizing("");
    }
  }

  async function handleEnhancePhoto() {
    const firstImageIndex = photoUrls.findIndex((u) => u.startsWith("http") || u.startsWith("data:"));
    if (firstImageIndex === -1) return toast.error("Upload a photo first");
    const firstImage = photoUrls[firstImageIndex];
    setOptimizing("photo");
    try {
      const result = await enhancePhoto(firstImage);
      if (!result.success) {
        toast.error(result.error || "Photo enhancement failed");
        return;
      }
      const next = [...photoUrls];
      next[firstImageIndex] = result.result;
      setPhotoUrls(next);
      toast.success("Photo enhanced");
    } finally {
      setOptimizing("");
    }
  }

  async function handleGenerateCaption() {
    const title = getValues("title");
    const description = getValues("description");
    const platform = selectedCaptionPlatform;
    if (!title || !description) return toast.error("Add a title and description first");
    if (!platform) return toast.error("Select a marketplace first");
    const brand = getValues("brand");
    const size = getValues("size");
    const color = getValues("color");
    const material = getValues("material");
    const condition = getValues("condition");
    setOptimizing("caption");
    try {
      const result = await generatePlatformCaption({ title, description, platform, brand, size, color, material, condition });
      if (!result.success) {
        toast.error(result.error || "Caption generation failed");
        return;
      }
      setCaptionPreview(result.result);
      setCaptionDialogOpen(true);
    } finally {
      setOptimizing("");
    }
  }

  function applyCaption() {
    if (!captionPreview) return;
    setValue("title", captionPreview.title, { shouldValidate: true });
    setValue("description", captionPreview.description, { shouldValidate: true });
    setCaptionDialogOpen(false);
    toast.success("Caption applied");
  }

  function getCleanValues() {
    const values = getValues();
    const valid = photoUrls.filter(
      (u) => u.trim().startsWith("http") || u.trim().startsWith("data:")
    );
    return { ...values, photos: valid.length > 0 ? valid : undefined } as Partial<ListingFormData>;
  }

  async function onSaveDraft() {
    setSaving(true);
    try {
      const result = await saveDraft(getCleanValues(), draftId);
      if (result && "error" in result && result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to save draft");
        return;
      }
      toast.success("Draft saved");
      if (!draftId && result && "listing" in result && result.listing) {
        router.push(`/listings/${result.listing.id}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error("Failed to save draft");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function onSaveTemplate() {
    const name = templateName.trim() || "Untitled template";
    const result = await saveTemplate(name, getCleanValues());
    if ("error" in result && result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Failed to save template");
      return;
    }
    toast.success("Template saved");
    setTemplateName("");
    router.refresh();
  }

  async function onSubmit(data: ListingFormData) {
    const validPhotos = photoUrls.filter(
      (u) => u.trim().startsWith("http") || u.trim().startsWith("data:")
    );
    if (validPhotos.length === 0) {
      toast.error("Add at least one valid photo");
      return;
    }

    if (mode === "draft" && draftId) {
      const result = await publishDraft(draftId, { ...data, photos: validPhotos });
      if (result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to publish draft");
        console.error(result.error);
        return;
      }
      if (!result.listing) {
        toast.error("Failed to publish draft");
        return;
      }
      toast.success("Draft published");
      router.push(`/listings/${result.listing.id}`);
      router.refresh();
      return;
    }

    const result = await createListing({ ...data, photos: validPhotos });
    if (result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Failed to create listing");
      console.error(result.error);
      return;
    }
    if (!result.listing) {
      toast.error("Listing creation failed");
      return;
    }
    toast.success("Listing created");
    router.push(`/listings/${result.listing.id}`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "draft" ? "Edit draft" : "Create new listing"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="template">Start from template</Label>
              <select
                id="template"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="">— No template —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="photos">Photos</Label>
            <Input
              id="photos"
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Or paste image URLs below. Uploading will store a base64 preview until cloud storage is connected.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {photoUrls.map(
                (url, index) =>
                  url.trim() &&
                  (url.startsWith("http") || url.startsWith("data:")) && (
                    <div key={index} className="relative aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="h-full w-full rounded-md object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )
              )}
            </div>

            {photoUrls.map(
              (url, index) =>
                !url.startsWith("data:") && (
                  <Input
                    key={index}
                    value={url}
                    onChange={(e) => updatePhoto(index, e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="mb-2"
                  />
                )
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={addPhotoField}>
                Add photo URL
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={analyzeWithAI}
                disabled={analyzing || watchedPhotos.length === 0}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {analyzing ? "Analyzing..." : "Generate with AI"}
              </Button>
            </div>
            {errors.photos && <p className="text-sm text-destructive">{errors.photos.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={5} {...register("description")} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wand2 className="h-4 w-4" />
              AI enhancements
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleOptimizeTitle} disabled={!!optimizing || !getValues("title")}>
                <Tag className="mr-1 h-3 w-3" />
                {optimizing === "title" ? "Optimizing..." : "Optimize title"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleOptimizeDescription} disabled={!!optimizing || !getValues("description")}>
                <Megaphone className="mr-1 h-3 w-3" />
                {optimizing === "description" ? "Optimizing..." : "Optimize description"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleSuggestPrice} disabled={!!optimizing || !getValues("title")}>
                <DollarSign className="mr-1 h-3 w-3" />
                {optimizing === "price" ? "Pricing..." : "Suggest price"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleEnhancePhoto} disabled={!!optimizing || !photoUrls.some((u) => u.startsWith("http") || u.startsWith("data:"))}>
                <ImageIcon className="mr-1 h-3 w-3" />
                {optimizing === "photo" ? "Enhancing..." : "Enhance photo"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                value={selectedCaptionPlatform}
                onChange={(e) => setSelectedCaptionPlatform(e.target.value)}
              >
                <option value="">Select marketplace...</option>
                {PLATFORMS.filter((p) => p.authType === "manual").map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button type="button" variant="secondary" size="sm" onClick={handleGenerateCaption} disabled={!!optimizing || !selectedCaptionPlatform || !getValues("title") || !getValues("description")}>
                <Sparkles className="mr-1 h-3 w-3" />
                {optimizing === "caption" ? "Writing..." : "Generate caption"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (USD)</Label>
              <Input id="price" type="number" step="0.01" {...register("price")} />
              {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost (USD)</Label>
              <Input id="cost" type="number" step="0.01" {...register("cost")} />
              {errors.cost && <p className="text-sm text-destructive">{errors.cost.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" type="number" {...register("quantity")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <select id="condition" {...register("condition")} className="w-full rounded-md border border-input bg-background px-3 py-2">
                {conditions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select id="category" {...register("category")} className="w-full rounded-md border border-input bg-background px-3 py-2">
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

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

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" className="flex-1" disabled={isSubmitting || analyzing}>
              {isSubmitting ? "Saving..." : mode === "draft" ? "Publish draft" : "Create listing"}
            </Button>
            <Button type="button" variant="outline" onClick={onSaveDraft} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save as draft"}
            </Button>
          </div>

          <div className="flex items-end gap-2 rounded-lg border p-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="templateName" className="text-xs">Save as template</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name"
              />
            </div>
            <Button type="button" variant="secondary" onClick={onSaveTemplate} disabled={!templateName.trim()}>
              <FileBox className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </form>

        <Dialog open={captionDialogOpen} onOpenChange={setCaptionDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Generated {PLATFORMS.find((p) => p.id === selectedCaptionPlatform)?.name || "marketplace"} caption</DialogTitle>
            </DialogHeader>
            {captionPreview && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Title</Label>
                  <p className="text-sm font-medium">{captionPreview.title}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="whitespace-pre-wrap text-sm">{captionPreview.description}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCaptionDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={applyCaption}>
                    Apply caption
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
