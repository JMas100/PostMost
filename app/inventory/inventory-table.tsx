"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlatformBadge } from "@/components/platform-badge";
import { InventoryCostCell } from "@/components/inventory-cost-cell";
import { bulkDeleteListings } from "@/lib/actions/listings";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface InventoryRow {
  id: string;
  title: string;
  sku: string | null;
  quantity: number;
  price: number;
  cost: number | null;
  photos: { id: string; url: string }[];
  platformListings: { id: string; platform: string; status: string }[];
}

export function InventoryTable({ listings, canDelete }: { listings: InventoryRow[]; canDelete: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const allSelected = listings.length > 0 && selected.size === listings.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(listings.map((l) => l.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkDelete() {
    const count = selected.size;
    if (count === 0) return;
    const label = count === 1 ? "this item" : `these ${count} items`;
    if (!window.confirm(`Delete ${label} from inventory? This can't be undone.`)) return;

    startTransition(async () => {
      const result = await bulkDeleteListings(Array.from(selected));
      if (result.success) {
        toast.success(count === 1 ? "Item deleted" : `${count} items deleted`);
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error("Couldn't delete those items. Try again.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {canDelete && selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/50 px-4 py-2">
          <p className="text-sm font-medium">{selected.size} selected</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isPending}>
              <Trash2 className="mr-1 h-4 w-4" />
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {canDelete && (
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} indeterminate={someSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                  </TableHead>
                )}
                <TableHead></TableHead>
                <TableHead>Item</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Margin</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Platforms</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((listing, index) => {
                const soldOut = listing.quantity === 0;
                const hasCost = listing.cost !== null;
                const margin = hasCost && listing.price > 0 ? ((listing.price - listing.cost!) / listing.price) * 100 : null;
                return (
                  <TableRow key={listing.id} data-state={selected.has(listing.id) ? "selected" : undefined}>
                    {canDelete && (
                      <TableCell>
                        <Checkbox
                          checked={selected.has(listing.id)}
                          onCheckedChange={() => toggleOne(listing.id)}
                          aria-label={`Select ${listing.title}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      {listing.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={listing.photos[0].url} alt="" className="h-10 w-10 rounded-md object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-muted" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/listings/${listing.id}`} className="font-medium hover:underline">
                        {listing.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{listing.sku || "—"}</TableCell>
                    <TableCell>
                      {soldOut ? (
                        <span className="text-xs font-medium text-muted-foreground">Sold out</span>
                      ) : (
                        listing.quantity
                      )}
                    </TableCell>
                    <TableCell>${listing.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <InventoryCostCell id={listing.id} initialCost={listing.cost} rowIndex={index} />
                    </TableCell>
                    <TableCell className={hasCost ? undefined : "text-muted-foreground"}>
                      {margin !== null ? `${margin.toFixed(0)}%` : "—"}
                    </TableCell>
                    <TableCell>${(listing.price * listing.quantity).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {listing.platformListings.slice(0, 3).map((pl) => (
                          <PlatformBadge key={pl.id} platform={pl.platform} status={pl.status} />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
