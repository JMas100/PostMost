"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
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
import { formatCurrency } from "@/lib/utils";
import { OptimizingState, ShippingProfileOption } from "./types";

const NO_SHIPPING_PROFILE = "__none__";

// A blended estimate, not any one marketplace's real fee schedule -- this shows before the user
// has picked which marketplaces to publish to (that's step 4), and actual fees are deducted for
// real once a sale lands (see the listing detail sale summary). ~13% lands near eBay/Poshmark's
// typical final-value fee, the two highest-volume platforms this app posts to.
const TYPICAL_FEE_RATE = 0.13;

function EstimatedProfit({ shippingProfiles }: { shippingProfiles: ShippingProfileOption[] }) {
  const { control } = useFormContext<ListingFormData>();
  const price = Number(useWatch({ control, name: "price" }) || 0);
  const cost = Number(useWatch({ control, name: "cost" }) || 0);
  const shippingProfileId = useWatch({ control, name: "shippingProfileId" });

  if (!price) return null;

  const shippingProfile = shippingProfiles.find((p) => p.id === shippingProfileId);
  const shippingCost = shippingProfile?.cost ?? 0;
  const fee = price * TYPICAL_FEE_RATE;
  const profit = price - cost - fee - shippingCost;

  return (
    <div className="rounded-lg border bg-muted/30 p-3.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Estimated profit</span>
        <span className={`tnum font-semibold ${profit < 0 ? "text-destructive" : "text-primary"}`}>
          {formatCurrency(profit)}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        After typical marketplace fees{shippingProfile ? ` and ${formatCurrency(shippingCost)} shipping` : ""}.
        Recalculates as you type.
      </p>
    </div>
  );
}

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

      <EstimatedProfit shippingProfiles={shippingProfiles} />

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
