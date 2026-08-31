"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlatformBadge } from "@/components/platform-badge";
import { Trash2, Ban, RefreshCw, Tag } from "lucide-react";
import { bulkDeleteListings } from "@/lib/actions/listings";
import { bulkDelist, bulkRelist } from "@/lib/actions/crosspost";
import { BulkPriceDialog } from "@/components/bulk-price-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ListingRow {
  id: string;
  title: string;
  price: number;
  cost: number | null;
  status: string;
  isDraft: boolean;
  photos: { id: string; url: string }[];
  platformListings: { id: string; platform: string; status: string }[];
}

export function ListingsTable({ listings }: { listings: ListingRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);

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
    const label = count === 1 ? "this listing" : `these ${count} listings`;
    if (!window.confirm(`Delete ${label}? This can't be undone.`)) return;

    startTransition(async () => {
      const result = await bulkDeleteListings(Array.from(selected));
      if (result.success) {
        toast.success(count === 1 ? "Listing deleted" : `${count} listings deleted`);
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error("Couldn't delete those listings. Try again.");
      }
    });
  }

  function handleBulkDelist() {
    const count = selected.size;
    if (count === 0) return;
    if (!window.confirm(`Delist ${count === 1 ? "this listing" : `these ${count} listings`} from every marketplace they're live on?`)) return;

    startTransition(async () => {
      const result = await bulkDelist(Array.from(selected));
      if (result.success) {
        toast.success(
          result.queued > 0
            ? `Queued ${result.queued} platform${result.queued === 1 ? "" : "s"} for delisting — check back in a minute.`
            : "Nothing to delist — none of the selected listings are live anywhere."
        );
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error("Couldn't queue delisting. Try again.");
      }
    });
  }

  function handleBulkRelist() {
    const count = selected.size;
    if (count === 0) return;
    if (!window.confirm(`Refresh ${count === 1 ? "this listing" : `these ${count} listings`}? This delists and reposts on every marketplace they're live on.`)) return;

    startTransition(async () => {
      const result = await bulkRelist(Array.from(selected));
      if (result.success) {
        toast.success(
          result.queued > 0
            ? `Queued ${result.queued} platform${result.queued === 1 ? "" : "s"} to refresh — check back in a minute.`
            : "Nothing to refresh — none of the selected listings are live anywhere."
        );
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error("Couldn't queue refresh. Try again.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/50 px-4 py-2">
          <p className="text-sm font-medium">{selected.size} selected</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPriceDialogOpen(true)} disabled={isPending}>
              <Tag className="mr-1 h-4 w-4" />
              Edit price
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkRelist} disabled={isPending}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkDelist} disabled={isPending}>
              <Ban className="mr-1 h-4 w-4" />
              Delist
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
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Platforms</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((listing) => (
                <TableRow key={listing.id} data-state={selected.has(listing.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(listing.id)}
                      onCheckedChange={() => toggleOne(listing.id)}
                      aria-label={`Select ${listing.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    {listing.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={listing.photos[0].url} alt="" className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-muted" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={listing.isDraft ? `/listings/${listing.id}` : `/listings/${listing.id}`}
                      className="font-medium hover:underline"
                    >
                      {listing.title}
                    </Link>
                  </TableCell>
                  <TableCell>${listing.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={listing.status === "SOLD" ? "success" : listing.isDraft ? "outline" : "outline"}>
                      {listing.isDraft ? "Draft" : listing.status === "SOLD" ? "Sold" : "Published"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {listing.platformListings.slice(0, 3).map((pl) => (
                        <PlatformBadge key={pl.id} platform={pl.platform} status={pl.status} />
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BulkPriceDialog
        open={priceDialogOpen}
        onOpenChange={setPriceDialogOpen}
        listings={listings
          .filter((l) => selected.has(l.id))
          .map((l) => ({
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
    </div>
  );
}
