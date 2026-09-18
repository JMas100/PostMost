"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2, DollarSign, Tag, Boxes, Hash, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlatformBadgeRow } from "@/components/platform-badge-row";
import { InventoryCostCell } from "@/components/inventory-cost-cell";
import { bulkDeleteListings } from "@/lib/actions/listings";
import { BulkPriceDialog } from "@/components/bulk-price-dialog";
import { BulkCostDialog } from "@/components/bulk-cost-dialog";
import { BulkQuantityDialog } from "@/components/bulk-quantity-dialog";
import { BulkSkuDialog } from "@/components/bulk-sku-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
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
  brand: string | null;
  category: string;
  quantity: number;
  price: number;
  cost: number | null;
  photos: { id: string; url: string }[];
  platformListings: { id: string; platform: string; status: string }[];
}

function downloadCsv(rows: InventoryRow[]) {
  const header = ["Title", "SKU", "Quantity", "Price", "Cost", "Margin %"];
  const body = rows.map((l) => {
    const margin = l.cost !== null && l.price > 0 ? (((l.price - l.cost) / l.price) * 100).toFixed(0) : "";
    return [l.title, l.sku ?? "", String(l.quantity), l.price.toFixed(2), l.cost !== null ? l.cost.toFixed(2) : "", margin];
  });
  const csv = [header, ...body]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function InventoryTable({ listings, canDelete }: { listings: InventoryRow[]; canDelete: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [skuDialogOpen, setSkuDialogOpen] = useState(false);

  const allSelected = listings.length > 0 && selected.size === listings.length;
  const someSelected = selected.size > 0 && !allSelected;
  const count = selected.size;
  const selectedListings = listings.filter((l) => selected.has(l.id));

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

  function performDelete() {
    startTransition(async () => {
      const result = await bulkDeleteListings(Array.from(selected));
      if (result.success) {
        toast.success(count === 1 ? "Item deleted" : `${count} items deleted`);
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error("Couldn't delete those items. Try again.");
      }
      setConfirmDelete(false);
    });
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 px-4 py-2">
          <p className="text-sm font-medium">{selected.size} selected</p>
          <Button size="sm" onClick={() => setCostDialogOpen(true)} disabled={isPending}>
            <DollarSign className="mr-1 h-4 w-4" />
            Set cost
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPriceDialogOpen(true)} disabled={isPending}>
            <Tag className="mr-1 h-4 w-4" />
            Edit price
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuantityDialogOpen(true)} disabled={isPending}>
            <Boxes className="mr-1 h-4 w-4" />
            Adjust quantity
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSkuDialogOpen(true)} disabled={isPending}>
            <Hash className="mr-1 h-4 w-4" />
            Generate SKUs
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCsv(selectedListings)} disabled={isPending}>
            <Download className="mr-1 h-4 w-4" />
            Export selected
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="ml-auto text-muted-foreground">
            Clear
          </Button>
        </div>
      )}

      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} indeterminate={someSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                </TableHead>
                <TableHead className="hidden xl:table-cell"></TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="hidden xl:table-cell">SKU</TableHead>
                <TableHead className="hidden text-right xl:table-cell">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="hidden text-right xl:table-cell">Margin</TableHead>
                <TableHead className="hidden text-right xl:table-cell">Value</TableHead>
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
                    <TableCell>
                      <Checkbox
                        checked={selected.has(listing.id)}
                        onCheckedChange={() => toggleOne(listing.id)}
                        aria-label={`Select ${listing.title}`}
                      />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {listing.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={listing.photos[0].url} alt="" className="h-10 w-10 rounded-md object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-muted" />
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] md:max-w-[260px] xl:max-w-none">
                      <div className="flex min-w-0 items-center gap-3">
                        {/* Below xl there's no separate photo column, and SKU/quantity join this
                            cell's second line instead of their own columns. */}
                        <span className="shrink-0 xl:hidden">
                          {listing.photos[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={listing.photos[0].url} alt="" className="h-9 w-9 rounded-md object-cover" />
                          ) : (
                            <span className="block h-9 w-9 rounded-md bg-muted" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link href={`/listings/${listing.id}`} className="block truncate font-medium hover:underline">
                            {listing.title}
                          </Link>
                          <p className="tnum truncate text-xs text-muted-foreground xl:hidden">
                            {listing.sku || "No SKU"} · Qty {soldOut ? "0" : listing.quantity}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground xl:table-cell">{listing.sku || "—"}</TableCell>
                    <TableCell className="tnum hidden text-right xl:table-cell">
                      {soldOut ? (
                        <span className="text-xs font-medium text-muted-foreground">Sold out</span>
                      ) : (
                        listing.quantity
                      )}
                    </TableCell>
                    <TableCell className="tnum text-right">
                      <div>${listing.price.toFixed(2)}</div>
                      {/* Margin joins the price cell below xl, where it has no column of its own. */}
                      <div className="text-xs text-muted-foreground xl:hidden">
                        {margin !== null ? `${margin.toFixed(0)}% margin` : "— margin"}
                      </div>
                    </TableCell>
                    <TableCell className="tnum text-right">
                      <InventoryCostCell id={listing.id} initialCost={listing.cost} rowIndex={index} />
                    </TableCell>
                    <TableCell className={cn("tnum hidden text-right xl:table-cell", hasCost ? undefined : "text-muted-foreground")}>
                      {margin !== null ? `${margin.toFixed(0)}%` : "—"}
                    </TableCell>
                    <TableCell className="tnum hidden text-right xl:table-cell">${(listing.price * listing.quantity).toFixed(2)}</TableCell>
                    <TableCell>
                      <PlatformBadgeRow platformListings={listing.platformListings} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-2 md:hidden">
        {listings.map((listing, index) => {
          const soldOut = listing.quantity === 0;
          const hasCost = listing.cost !== null;
          const margin = hasCost && listing.price > 0 ? ((listing.price - listing.cost!) / listing.price) * 100 : null;
          return (
            <Card key={listing.id}>
              <CardContent className="flex gap-3 p-3">
                <Checkbox
                  checked={selected.has(listing.id)}
                  onCheckedChange={() => toggleOne(listing.id)}
                  aria-label={`Select ${listing.title}`}
                  className="mt-1"
                />
                <div className="flex min-w-0 flex-1 gap-3">
                  <Link href={`/listings/${listing.id}`} className="shrink-0">
                    {listing.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={listing.photos[0].url} alt="" className="h-14 w-14 rounded-md object-cover" />
                    ) : (
                      <div className="h-14 w-14 rounded-md bg-muted" />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/listings/${listing.id}`} className="truncate font-medium hover:underline">
                        {listing.title}
                      </Link>
                      <p className="tnum shrink-0 font-medium">${listing.price.toFixed(2)}</p>
                    </div>
                    <p className="tnum text-xs text-muted-foreground">
                      {listing.sku || "No SKU"} · {soldOut ? "Sold out" : `Qty ${listing.quantity}`} ·{" "}
                      {margin !== null ? `${margin.toFixed(0)}% margin` : "no cost recorded"}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Cost:</span>
                      <InventoryCostCell id={listing.id} initialCost={listing.cost} rowIndex={index} />
                    </div>
                    <PlatformBadgeRow platformListings={listing.platformListings} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <BulkPriceDialog
        open={priceDialogOpen}
        onOpenChange={setPriceDialogOpen}
        listings={selectedListings.map((l) => ({
          id: l.id,
          title: l.title,
          price: l.price,
          cost: l.cost,
          hasLivePlatform: l.platformListings.some((pl) => pl.status === "POSTED"),
        }))}
        onApplied={() => {
          setSelected(new Set());
          router.refresh();
        }}
      />

      <BulkCostDialog
        open={costDialogOpen}
        onOpenChange={setCostDialogOpen}
        listings={selectedListings.map((l) => ({ id: l.id, title: l.title, cost: l.cost }))}
        onApplied={() => {
          setSelected(new Set());
          router.refresh();
        }}
      />

      <BulkQuantityDialog
        open={quantityDialogOpen}
        onOpenChange={setQuantityDialogOpen}
        listings={selectedListings.map((l) => ({ id: l.id, title: l.title, quantity: l.quantity }))}
        onApplied={() => {
          setSelected(new Set());
          router.refresh();
        }}
      />

      <BulkSkuDialog
        open={skuDialogOpen}
        onOpenChange={setSkuDialogOpen}
        listings={selectedListings.map((l) => ({ id: l.id, title: l.title, sku: l.sku, brand: l.brand, category: l.category }))}
        onApplied={() => {
          setSelected(new Set());
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        pending={isPending}
        title={`Delete ${count === 1 ? "this item" : `these ${count} items`} from inventory?`}
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={performDelete}
      />
    </div>
  );
}
