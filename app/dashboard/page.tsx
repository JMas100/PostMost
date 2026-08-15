import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, Activity } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [listingCount, postedCount, accountCount] = await Promise.all([
    prisma.listing.count({ where: { userId: session.user.id, isDraft: false } }),
    prisma.platformListing.count({
      where: { listing: { userId: session.user.id, isDraft: false }, status: "POSTED" },
    }),
    prisma.marketplaceAccount.count({ where: { userId: session.user.id } }),
  ]);

  const recentListings = await prisma.listing.findMany({
    where: { userId: session.user.id, isDraft: false },
    include: { photos: true, platformListings: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {session.user.name || session.user.email}.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-3xl font-bold">
                <Package className="h-6 w-6 text-muted-foreground" />
                {listingCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Live Cross-Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-3xl font-bold">
                <Activity className="h-6 w-6 text-muted-foreground" />
                {postedCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Connected Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-3xl font-bold">
                <DollarSign className="h-6 w-6 text-muted-foreground" />
                {accountCount}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Listings</h2>
          <Link href="/listings/new" className={buttonVariants()}>
            Create listing
          </Link>
        </div>

        {recentListings.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No listings yet. Create your first listing to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentListings.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {listing.photos[0] && (
                        <img src={listing.photos[0].url} alt="" className="h-16 w-16 rounded-md object-cover" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium line-clamp-1">{listing.title}</p>
                        <p className="text-sm text-muted-foreground">${listing.price.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {listing.platformListings.length} platform listing(s)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
