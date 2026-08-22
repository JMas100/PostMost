import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { PlatformBadge } from "@/components/platform-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getInventory } from "@/lib/actions/inventory";
import { InventoryFilters } from "./inventory-filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { q?: string; filter?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const missingCostOnly = searchParams.filter === "missing-cost";
  const {
    listings,
    totalCount,
    activeCount,
    activeLimit,
    totalValue,
    missingCostCount,
    costBasis,
    potentialProfit,
  } = await getInventory({ q: searchParams.q, missingCostOnly });

  const isFiltered = Boolean(searchParams.q || missingCostOnly);

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
            <p className="text-muted-foreground">Track stock, price, and marketplace status for every item.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/listings/import" className={buttonVariants({ variant: "outline" })}>
              Import CSV
            </Link>
            <Link href="/listings/new" className={buttonVariants()}>
              New Listing
            </Link>
          </div>
        </div>

        {totalCount === 0 ? (
          <EmptyState
            variant="first-run"
            headline="Nothing in inventory"
            body="Inventory tracks what you paid so profit is calculated for you at sale. Items you list are added automatically — or bring a spreadsheet you already keep."
            primaryAction={{ label: "Add your first item", href: "/listings/new" }}
            secondaryAction={{ label: "Import a CSV", href: "/listings/import", badge: "GROW" }}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Items in stock</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-bold">
                    {activeCount}
                    <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                      {activeLimit === -1 ? "unlimited" : `of ${activeLimit}`}
                    </span>
                  </div>
                  {activeLimit > 0 && <Progress value={Math.min((activeCount / activeLimit) * 100, 100)} />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Cost basis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${costBasis.toFixed(2)}</div>
                  {missingCostCount > 0 && (
                    <p className="mt-1 text-xs text-warning">{missingCostCount} items missing cost</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Listed value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Potential profit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${potentialProfit.toFixed(2)}</div>
                  <p className="mt-1 text-xs text-muted-foreground">Items with a recorded cost only</p>
                </CardContent>
              </Card>
            </div>

            {missingCostCount > 0 && (
              <Card className="border-warning/40">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-warning">
                      —<span className="ml-2 text-sm font-semibold align-middle">{missingCostCount} missing</span>
                    </span>
                    <div>
                      <p className="text-sm font-medium">Profit needs a cost per item</p>
                      <p className="text-sm text-muted-foreground">
                        {missingCostCount} of {totalCount} items have no cost recorded, so profit and margin
                        stay blank rather than wrong.
                      </p>
                    </div>
                  </div>
                  <Link href="/listings" className={buttonVariants({ variant: "outline" })}>
                    Add costs
                  </Link>
                </CardContent>
              </Card>
            )}

            <InventoryFilters />

            {listings.length === 0 ? (
              <EmptyState
                variant="filtered"
                headline={searchParams.q ? `No items match "${searchParams.q}"` : "No items match this filter"}
                body={`You have ${totalCount} item${totalCount === 1 ? "" : "s"} in inventory. ${isFiltered ? "Filters are narrowing them to none." : ""}`}
                primaryAction={{ label: "Clear filters", href: "/inventory" }}
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                      {listings.map((listing) => {
                        const soldOut = listing.quantity === 0;
                        const hasCost = listing.cost !== null;
                        const margin = hasCost && listing.price > 0 ? ((listing.price - listing.cost!) / listing.price) * 100 : null;
                        return (
                          <TableRow key={listing.id}>
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
                            <TableCell className={hasCost ? undefined : "text-warning"}>
                              {hasCost ? `$${listing.cost!.toFixed(2)}` : "—"}
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
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
