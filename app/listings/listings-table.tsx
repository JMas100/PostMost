"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusPill } from "@/components/status-pill";
import { PlatformTileRow } from "@/components/platform-tile-row";
import { computeListingStatus } from "@/lib/listing-status";
import { Trash2, Ban, RefreshCw, Tag, Share2, MoreVertical, Pencil, Copy } from "lucide-react";
import { bulkDeleteListings, duplicateListing, deleteListing } from "@/lib/actions/listings";
import { bulkDelist, bulkRelist } from "@/lib/actions/crosspost";
import { BulkPriceDialog } from "@/components/bulk-price-dialog";
import { BulkPostToMoreDialog } from "@/components/bulk-post-to-more-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
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
  category: string;
  sku: string | null;
  status: string;
  isDraft: boolean;
  updatedAt: Date;
  photos: { id: string; url: string }[];
  platformListings: { id: string; platform: string; status: string }[];
}

export function ListingsTable({
  listings,
  canDelete = true,
  connectedPlatforms = [],
}: {
  listings: ListingRow[];
  canDelete?: boolean;
  connectedPlatforms?: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [postToMoreOpen, setPostToMoreOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"delete" | "delist" | "relist" | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [rowDeleteTarget, setRowDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [rowDeletePending, startRowDeleteTransition] = useTransition();

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

  function handleDuplicate(id: string) {
    setDuplicatingId(id);
    startTransition(async () => {
      const result = await duplicateListing(id);
      if ("error" in result && result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Couldn't duplicate this listing.");
        setDuplicatingId(null);
        return;
      }
      toast.success("Listing duplicated");
      setDuplicatingId(null);
      router.refresh();
    });
  }

  function performRowDelete() {
    if (!rowDeleteTarget) return;
    startRowDeleteTransition(async () => {
      try {
        await deleteListing(rowDeleteTarget.id);
        toast.success(`Deleted "${rowDeleteTarget.title}"`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete this listing.");
      }
      setRowDeleteTarget(null);
    });
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 px-4 py-2">
          <p className="text-sm font-medium">{selected.size} selected</p>
          <Button size="sm" onClick={() => setPriceDialogOpen(true)} disabled={isPending}>
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
          <Button variant="outline" size="sm" onClick={() => setPostToMoreOpen(true)} disabled={isPending}>
            <Share2 className="mr-1 h-4 w-4" />
            Post to more
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmAction("delete")}
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
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="hidden w-40 lg:table-cell">Live on</TableHead>
                <TableHead className="hidden w-28 lg:table-cell">Updated</TableHead>
                <TableHead className="w-11"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((listing) => {
                const statusInfo = computeListingStatus(listing);
                const liveOnCell =
                  statusInfo.kind === "draft" ? (
                    <span className="text-xs text-muted-foreground">Not published</span>
                  ) : statusInfo.kind === "sold" ? (
                    <span className="text-xs text-muted-foreground">
                      {listing.platformListings.length > 0
                        ? `Delisted from ${listing.platformListings.length}`
                        : "—"}
                    </span>
                  ) : (
                    <PlatformTileRow platformListings={listing.platformListings} />
                  );
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
                    <TableCell className="max-w-[220px] md:max-w-[280px] xl:max-w-[380px]">
                      <Link href={`/listings/${listing.id}`} className="flex min-w-0 items-center gap-3 hover:underline">
                        {/* Below xl there's no separate photo column, so the thumbnail moves in
                            here instead of disappearing. */}
                        <span className="shrink-0 xl:hidden">
                          {listing.photos[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={listing.photos[0].url} alt="" className="h-9 w-9 rounded-md object-cover" />
                          ) : (
                            <span className="block h-9 w-9 rounded-md bg-muted" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{listing.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {listing.category} · {listing.sku || "no SKU"}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="tnum text-right">{formatCurrency(listing.price)}</TableCell>
                    <TableCell>
                      <StatusPill status={statusInfo} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="max-w-[140px] overflow-hidden">{liveOnCell}</div>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {formatDistanceToNowStrict(listing.updatedAt, { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground"
                              aria-label={`More actions for ${listing.title}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            render={<Link href={`/listings/${listing.id}?edit=1`} />}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={duplicatingId === listing.id}
                            onClick={() => handleDuplicate(listing.id)}
                          >
                            <Copy className="h-4 w-4" />
                            {duplicatingId === listing.id ? "Duplicating…" : "Duplicate"}
                          </DropdownMenuItem>
                          {canDelete && (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setRowDeleteTarget({ id: listing.id, title: listing.title })}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
          const statusInfo = computeListingStatus(listing);
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
                      <p className="tnum shrink-0 font-medium">{formatCurrency(listing.price)}</p>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {listing.category} · {listing.sku || "no SKU"}
                    </p>
                    <StatusPill status={statusInfo} />
                  </div>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="mt-1 shrink-0 text-muted-foreground"
                        aria-label={`More actions for ${listing.title}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem render={<Link href={`/listings/${listing.id}?edit=1`} />}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={duplicatingId === listing.id}
                      onClick={() => handleDuplicate(listing.id)}
                    >
                      <Copy className="h-4 w-4" />
                      {duplicatingId === listing.id ? "Duplicating…" : "Duplicate"}
                    </DropdownMenuItem>
                    {canDelete && (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setRowDeleteTarget({ id: listing.id, title: listing.title })}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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

      <BulkPostToMoreDialog
        open={postToMoreOpen}
        onOpenChange={setPostToMoreOpen}
        listings={listings
          .filter((l) => selected.has(l.id))
          .map((l) => ({ id: l.id, title: l.title, platformListings: l.platformListings }))}
        connectedPlatforms={connectedPlatforms}
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

      <ConfirmDialog
        open={rowDeleteTarget !== null}
        onOpenChange={(open) => !open && setRowDeleteTarget(null)}
        pending={rowDeletePending}
        variant="destructive"
        title={`Delete "${rowDeleteTarget?.title}"?`}
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={performRowDelete}
      />
    </div>
  );
}
