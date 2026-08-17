import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Package, Activity, DollarSign, TrendingUp, Store } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [listingCount, postedCount, accountCount, soldAgg] = await Promise.all([
    prisma.listing.count({ where: { userId: session.user.id, isDraft: false } }),
    prisma.platformListing.count({
      where: { listing: { userId: session.user.id, isDraft: false }, status: "POSTED" },
    }),
    prisma.marketplaceAccount.count({ where: { userId: session.user.id } }),
    prisma.platformListing.aggregate({
      where: { listing: { userId: session.user.id }, status: "SOLD" },
      _sum: { soldPrice: true, profit: true },
    }),
  ]);

  const recentListings = await prisma.listing.findMany({
    where: { userId: session.user.id, isDraft: false },
    include: { photos: true, platformListings: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const totalRevenue = soldAgg._sum.soldPrice ?? 0;
  const totalProfit = soldAgg._sum.profit ?? 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">Welcome back, {session.user.name || session.user.email}.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Package className="h-4 w-4" /> Total listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{listingCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Activity className="h-4 w-4" /> Live cross-posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{postedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Store className="h-4 w-4" /> Connected marketplaces
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-foreground">{accountCount}</div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  Live
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <DollarSign className="h-4 w-4" /> Total profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">${totalProfit.toFixed(2)}</div>
              {profitMargin > 0 && (
                <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <TrendingUp className="h-3 w-3" /> +{profitMargin.toFixed(1)}%
                </div>
              )}
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
                      <div className="flex-1 min-w-0">
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
