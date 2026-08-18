"use client";

import { Controller, useFormContext } from "react-hook-form";
import { ListingFormData } from "@/lib/schemas/listing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign } from "lucide-react";
import { OptimizingState, ShippingProfileOption } from "./types";

const NO_SHIPPING_PROFILE = "__none__";

export function StepPricing({
  optimizing,
  onSuggestPrice,
  shippingProfiles,
}: {
  optimizing: OptimizingState;
  onSuggestPrice: () => void;
  shippingProfiles: ShippingProfileOption[];
}) {
  const {
    register,
    control,
    getValues,
    formState: { errors },
  } = useFormContext<ListingFormData>();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="price">Price (USD)</Label>
            <Button type="button" variant="outline" size="sm" onClick={onSuggestPrice} disabled={!!optimizing || !getValues("title")}>
              <DollarSign className="mr-1 h-3 w-3" />
              {optimizing === "price" ? "Pricing..." : "Suggest price"}
            </Button>
          </div>
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
        {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
      </div>

      {shippingProfiles.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="shippingProfileId">Shipping profile</Label>
          <Controller
            control={control}
            name="shippingProfileId"
            render={({ field }) => (
              <Select
                value={field.value || NO_SHIPPING_PROFILE}
                onValueChange={(v) => field.onChange(!v || v === NO_SHIPPING_PROFILE ? null : v)}
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
            )}
          />
        </div>
      )}
    </div>
  );
}
