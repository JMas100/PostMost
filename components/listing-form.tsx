"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { listingSchema, ListingFormData } from "@/lib/schemas/listing";
import { createListing } from "@/lib/actions/listings";
import { generateListingFromPhoto } from "@/lib/actions/ai-generate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, Trash2 } from "lucide-react";

const conditions = ["New with tags", "New without tags", "Like new", "Good", "Fair", "Poor"];
const categories = ["Clothing", "Shoes", "Accessories", "Electronics", "Home", "Toys", "Sports", "Vintage", "Other"];

export function ListingForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([""]);
  const [analyzing, setAnalyzing] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      condition: "Good",
      category: "Clothing",
      quantity: 1,
      photos: [],
    },
  });

  const watchedPhotos = watch("photos");

  useEffect(() => {
    const validPhotos = photoUrls.filter(
      (u) => u.trim().startsWith("http") || u.trim().startsWith("data:")
    );
    setValue("photos", validPhotos, { shouldValidate: true });
  }, [photoUrls, setValue]);

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
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
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

  async function onSubmit(data: ListingFormData) {
    const validPhotos = photoUrls.filter(
      (u) => u.trim().startsWith("http") || u.trim().startsWith("data:")
    );
    if (validPhotos.length === 0) {
      toast.error("Add at least one valid photo");
      return;
    }
    const result = await createListing({ ...data, photos: validPhotos });
    if (result.error) {
      toast.error("Failed to create listing");
      console.error(result.error);
      return;
    }
    toast.success("Listing created");
    router.push(`/listings/${result.listing.id}`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create new listing</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (USD)</Label>
              <Input id="price" type="number" step="0.01" {...register("price")} />
              {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" {...register("quantity")} />
            </div>
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

          <Button type="submit" className="w-full" disabled={isSubmitting || analyzing}>
            {isSubmitting ? "Creating..." : "Create listing"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
