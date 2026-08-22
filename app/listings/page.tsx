import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PlatformBadge } from "@/components/platform-badge";
import { getPlatform } from "@/lib/marketplaces/platforms";
import { ListingsFilters } from "./listings-filters";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 25;

export default async function ListingsPage(
  props: {
    searchParams: Promise<{ q?: string; status?: string; platform?: string; page?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const q = searchParams.q?.trim();
  const status = searchParams.status;
  const platform = searchParams.platform;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const where = {
    userId,
    isDraft: false,
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
    ...(status ? { status } : {}),
    ...(platform ? { platformListings: { some: { platform } } } : {}),
  };

  const [totalCount, filteredCount, platformRows] = await Promise.all([
    prisma.listing.count({ where: { userId, isDraft: false } }),
    prisma.listing.count({ where }),
    prisma.platformListing.findMany({
      where: { listing: { userId, isDraft: false } },
      select: { platform: true },
      distinct: ["platform"],
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);

  const listings = await prisma.listing.findMany({
    where,
    include: { photos: true, platformListings: true },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    skip: (clampedPage - 1) * PAGE_SIZE,
  });
  const buildPageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (platform) params.set("platform", platform);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/listings?${qs}` : "/listings";
  };

  const platformOptions = platformRows
    .map((row) => ({ id: row.platform, name: getPlatform(row.platform)?.name ?? row.platform }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Listings</h1>
          <Link href="/listings/new" className={buttonVariants()}>
            Create listing
          </Link>
        </div>

        {totalCount > 0 && <ListingsFilters platformOptions={platformOptions} />}

        {totalCount === 0 ? (
          <EmptyState
            variant="first-run"
            headline="No listings yet"
            body="Post an item once and it goes live everywhere you sell. Already listed elsewhere? Import what you have and cross-post from there."
            primaryAction={{ label: "Create your first listing", href: "/listings/new" }}
            secondaryAction={{ label: "Import a CSV", href: "/listings/import", badge: "GROW" }}
          />
        ) : listings.length === 0 ? (
          <EmptyState
            variant="filtered"
            headline={q ? `No listings match "${q}"` : "No listings match these filters"}
            body={`You have ${totalCount} listing${totalCount === 1 ? "" : "s"}. Filters are narrowing them to none.`}
            primaryAction={{ label: "Clear filters", href: "/listings" }}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Platforms</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings.map((listing) => (
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
                      <TableCell>${listing.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={listing.status === "SOLD" ? "success" : "outline"}>
                          {listing.status === "SOLD" ? "Sold" : "Published"}
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
        )}

        {listings.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              Showing {(clampedPage - 1) * PAGE_SIZE + 1}–{Math.min(clampedPage * PAGE_SIZE, filteredCount)} of{" "}
              {filteredCount}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={buildPageHref(clampedPage - 1)}
                aria-disabled={clampedPage <= 1}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  clampedPage <= 1 && "pointer-events-none opacity-50"
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Link>
              <span className="text-muted-foreground">
                Page {clampedPage} of {totalPages}
              </span>
              <Link
                href={buildPageHref(clampedPage + 1)}
                aria-disabled={clampedPage >= totalPages}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  clampedPage >= totalPages && "pointer-events-none opacity-50"
                )}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
