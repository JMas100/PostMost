import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { getPlatform } from "@/lib/marketplaces/platforms";
import { ListingsFilters } from "./listings-filters";
import { ListingsTabs, type ListingsTab } from "./listings-tabs";
import { ListingsTable } from "./listings-table";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 25;

function tabWhere(tab: ListingsTab, userId: string): Prisma.ListingWhereInput {
  switch (tab) {
    case "live":
      return { userId, isDraft: false, status: "PUBLISHED" };
    case "drafts":
      return { userId, isDraft: true };
    case "sold":
      return { userId, isDraft: false, status: "SOLD" };
    case "attention":
      return { userId, isDraft: false, platformListings: { some: { status: "FAILED" } } };
    case "all":
    default:
      return { userId };
  }
}

export default async function ListingsPage(
  props: {
    searchParams: Promise<{ q?: string; platform?: string; page?: string; tab?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const q = searchParams.q?.trim();
  const platform = searchParams.platform;
  const tab = (["all", "live", "drafts", "sold", "attention"].includes(searchParams.tab ?? "")
    ? searchParams.tab
    : "all") as ListingsTab;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const where: Prisma.ListingWhereInput = {
    ...tabWhere(tab, userId),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
    ...(platform ? { platformListings: { some: { platform } } } : {}),
  };

  const [totalCount, filteredCount, platformRows, tabCounts] = await Promise.all([
    prisma.listing.count({ where: { userId } }),
    prisma.listing.count({ where }),
    prisma.platformListing.findMany({
      where: { listing: { userId } },
      select: { platform: true },
      distinct: ["platform"],
    }),
    Promise.all(
      (["all", "live", "drafts", "sold", "attention"] as ListingsTab[]).map(async (t) => [
        t,
        await prisma.listing.count({ where: tabWhere(t, userId) }),
      ] as const)
    ),
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
    if (platform) params.set("platform", platform);
    if (tab !== "all") params.set("tab", tab);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/listings?${qs}` : "/listings";
  };

  const platformOptions = platformRows
    .map((row) => ({ id: row.platform, name: getPlatform(row.platform)?.name ?? row.platform }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const counts = Object.fromEntries(tabCounts) as Record<ListingsTab, number>;

  return (
    <Shell>
      <div className="space-y-6">
        <PageHeader
          title="Listings"
          actions={
            <Link href="/listings/new" className={buttonVariants()}>
              Create listing
            </Link>
          }
        />

        {totalCount > 0 && <ListingsTabs counts={counts} />}

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
          <ListingsTable listings={listings} />
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
