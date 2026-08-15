"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { listingSchema, ListingFormData } from "@/lib/schemas/listing";
import { createListing } from "@/lib/actions/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const conditions = ["New with tags", "New without tags", "Like new", "Good", "Fair", "Poor"];
const categories = ["Clothing", "Shoes", "Accessories", "Electronics", "Home", "Toys", "Sports", "Vintage", "Other"];

export function ListingForm() {
  const router = useRouter();
  const [photoUrls, setPhotoUrls] = useState<string[]>([""]);
  const {
    register,
    handleSubmit,
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

  function addPhotoField() {
    setPhotoUrls([...photoUrls, ""]);
  }

  function updatePhoto(index: number, value: string) {
    const next = [...photoUrls];
    next[index] = value;
    setPhotoUrls(next);
  }

  async function onSubmit(data: ListingFormData) {
    const validPhotos = photoUrls.filter((u) => u.trim().startsWith("http"));
    if (validPhotos.length === 0) {
      toast.error("Add at least one valid photo URL");
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

          <div className="space-y-2">
            <Label>Photo URLs</Label>
            {photoUrls.map((url, index) => (
              <Input
                key={index}
                value={url}
                onChange={(e) => updatePhoto(index, e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="mb-2"
              />
            ))}
            <Button type="button" variant="outline" onClick={addPhotoField}>
              Add another photo
            </Button>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create listing"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
