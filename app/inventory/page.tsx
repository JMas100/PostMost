import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { PlatformBadge } from "@/components/platform-badge";
import { getInventory } from "@/lib/actions/inventory";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { listings, activeCount, activeLimit, totalValue } = await getInventory();

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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">{activeCount}</span>
              <span className="text-sm text-muted-foreground">
                {activeLimit === -1 ? "Unlimited" : `of ${activeLimit} active items`}
                {" · "}
                ${totalValue.toFixed(2)} total value
              </span>
            </div>
            {activeLimit > 0 && <Progress value={Math.min((activeCount / activeLimit) * 100, 100)} />}
          </CardContent>
        </Card>

        {listings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="mb-4">You don&apos;t have any inventory yet.</p>
              <Link href="/listings/new" className={buttonVariants()}>
                Create your first listing
              </Link>
            </CardContent>
          </Card>
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
                    <TableHead>Value</TableHead>
                    <TableHead>Platforms</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings.map((listing) => {
                    const soldOut = listing.quantity === 0;
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
      </div>
    </Shell>
  );
}
