"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlatformBadgeRow } from "@/components/platform-badge-row";
import { Trash2, Ban, RefreshCw, Tag } from "lucide-react";
import { bulkDeleteListings } from "@/lib/actions/listings";
import { bulkDelist, bulkRelist } from "@/lib/actions/crosspost";
import { BulkPriceDialog } from "@/components/bulk-price-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
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

function listingNeedsAttention(listing: ListingRow): boolean {
  return !listing.isDraft && listing.platformListings.some((pl) => pl.status === "FAILED");
}

export function ListingsTable({ listings, canDelete = true }: { listings: ListingRow[]; canDelete?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"delete" | "delist" | "relist" | null>(null);

  const allSelected = listings.length > 0 && selected.size === listings.length;
  const someSelected = selected.size > 0 && !allSelected;
  const count = selected.size;

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
        toast.success(count === 1 ? "Listing deleted" : `${count} listings deleted`);
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error("Couldn't delete those listings. Try again.");
      }
      setConfirmAction(null);
    });
  }

  function performDelist() {
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
        toast.error(result.error || "Couldn't queue delisting. Try again.");
      }
      setConfirmAction(null);
    });
  }

  function performRelist() {
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
        toast.error(result.error || "Couldn't queue refresh. Try again.");
      }
      setConfirmAction(null);
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
            <Button variant="outline" size="sm" onClick={() => setConfirmAction("relist")} disabled={isPending}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmAction("delist")} disabled={isPending}>
              <Ban className="mr-1 h-4 w-4" />
              Delist
            </Button>
            {canDelete && (
              <Button variant="destructive" size="sm" onClick={() => setConfirmAction("delete")} disabled={isPending}>
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table at md+; a card list takes over below md (a table scales with cross-posted
          columns, but a 6-column row forced into a phone width is unreadable no matter how
          much gets hidden -- the handoff's own decision keeps a card grid at mobile widths). */}
      <Card className="hidden md:block">
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
                <TableHead className="hidden xl:table-cell"></TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Platforms</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((listing) => {
                const needsAttention = listingNeedsAttention(listing);
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
                    <TableCell className="max-w-[220px] md:max-w-[280px] xl:max-w-none">
                      <Link href={`/listings/${listing.id}`} className="flex min-w-0 items-center gap-3 font-medium hover:underline">
                        {/* Below xl there's no separate photo column, so the thumbnail moves in
                            here instead of disappearing. */}
                        <span className="xl:hidden">
                          {listing.photos[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={listing.photos[0].url} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                          ) : (
                            <span className="block h-9 w-9 shrink-0 rounded-md bg-muted" />
                          )}
                        </span>
                        <span className="truncate">{listing.title}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="tnum text-right">${listing.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={needsAttention ? "warning" : listing.status === "SOLD" ? "success" : "outline"}>
                        {needsAttention ? "Needs attention" : listing.isDraft ? "Draft" : listing.status === "SOLD" ? "Sold" : "Published"}
                      </Badge>
                    </TableCell>
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
        {listings.map((listing) => {
          const needsAttention = listingNeedsAttention(listing);
          return (
            <Card key={listing.id}>
              <CardContent className="flex gap-3 p-3">
                <Checkbox
                  checked={selected.has(listing.id)}
                  onCheckedChange={() => toggleOne(listing.id)}
                  aria-label={`Select ${listing.title}`}
                  className="mt-1"
                />
                <Link href={`/listings/${listing.id}`} className="flex min-w-0 flex-1 gap-3">
                  {listing.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={listing.photos[0].url} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-md bg-muted" />
                  )}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-medium">{listing.title}</p>
                      <p className="tnum shrink-0 font-medium">${listing.price.toFixed(2)}</p>
                    </div>
                    <Badge variant={needsAttention ? "warning" : listing.status === "SOLD" ? "success" : "outline"}>
                      {needsAttention ? "Needs attention" : listing.isDraft ? "Draft" : listing.status === "SOLD" ? "Sold" : "Published"}
                    </Badge>
                    <PlatformBadgeRow platformListings={listing.platformListings} />
                  </div>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

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

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        pending={isPending}
        variant={confirmAction === "delete" ? "destructive" : "default"}
        title={
          confirmAction === "delete"
            ? `Delete ${count === 1 ? "this listing" : `these ${count} listings`}?`
            : confirmAction === "delist"
              ? `Delist ${count === 1 ? "this listing" : `these ${count} listings`}?`
              : `Refresh ${count === 1 ? "this listing" : `these ${count} listings`}?`
        }
        description={
          confirmAction === "delete"
            ? "This can't be undone."
            : confirmAction === "delist"
              ? "This removes them from every marketplace they're currently live on."
              : "This delists and reposts them on every marketplace they're currently live on."
        }
        confirmLabel={confirmAction === "delete" ? "Delete" : confirmAction === "delist" ? "Delist" : "Refresh"}
        onConfirm={() => {
          if (confirmAction === "delete") performDelete();
          else if (confirmAction === "delist") performDelist();
          else if (confirmAction === "relist") performRelist();
        }}
      />
    </div>
  );
}
