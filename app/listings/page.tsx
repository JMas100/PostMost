import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { PlatformBadge } from "@/components/platform-badge";

export default async function ListingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const listings = await prisma.listing.findMany({
    where: { userId: session.user.id, isDraft: false },
    include: { photos: true, platformListings: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Listings</h1>
          <Link href="/listings/new" className={buttonVariants()}>
            Create listing
          </Link>
        </div>

        {listings.length === 0 ? (
          <EmptyState
            variant="first-run"
            headline="No listings yet"
            body="Post an item once and it goes live everywhere you sell. Already listed elsewhere? Import what you have and cross-post from there."
            primaryAction={{ label: "Create your first listing", href: "/listings/new" }}
            secondaryAction={{ label: "Import a CSV", href: "/listings/import", badge: "GROW" }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent>
                    <div className="flex gap-4">
                      {listing.photos[0] ? (
                        <img src={listing.photos[0].url} alt="" className="h-20 w-20 rounded-md object-cover" />
                      ) : (
                        <div className="h-20 w-20 rounded-md bg-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-1">{listing.title}</p>
                        <p className="text-sm text-muted-foreground">${listing.price.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{listing.status.toLowerCase()}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {listing.platformListings.slice(0, 3).map((pl) => (
                            <PlatformBadge key={pl.id} platform={pl.platform} status={pl.status} />
                          ))}
                        </div>
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
