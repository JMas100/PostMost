import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { requireWorkspace } from "@/lib/auth-helpers";
import { Shell } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { JobTimeline } from "@/components/job-status";
import { ListingForm } from "@/components/listing-form";
import { getTemplates } from "@/lib/actions/templates";
import { getShippingProfiles } from "@/lib/actions/shipping";
import { getMarketplaceAccounts } from "@/lib/actions/accounts";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { PublishPanel } from "@/components/publish-panel";
import { FailedCrossPostCard } from "@/components/publish-panel/failed-cross-post-card";
import { PlatformLogo } from "@/components/platform-logo";
import { getPlatform } from "@/lib/marketplaces/platforms";
import { SoldButton } from "./sold-button";
import { ListingDeleteButton } from "@/components/listing-delete-button";
import { ListingDuplicateButton } from "@/components/listing-duplicate-button";
import { StatusPill } from "@/components/status-pill";
import { ListingPhotoGallery } from "@/components/listing-photo-gallery";
import { computeListingStatus } from "@/lib/listing-status";
import { cn, formatCurrency } from "@/lib/utils";

export default async function ListingDetailPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ published?: string; edit?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { workspaceUserId, role } = await requireWorkspace();
  const canDelete = role !== "MEMBER";

  const listing = await prisma.listing.findFirst({
    where: { id: params.id, userId: workspaceUserId },
    include: { photos: true, platformListings: true, shippingProfile: true, jobs: { orderBy: { createdAt: "desc" } } },
  });

  if (!listing) redirect("/listings");

  const templates = await getTemplates();
  const shippingProfiles = await getShippingProfiles();
  const accounts = await getMarketplaceAccounts();

  const isEditing = searchParams.edit === "1";

  if (listing.isDraft || isEditing) {
    const initialData: Record<string, unknown> = {
      ...listing,
      photos: listing.photos.map((p) => p.url),
      shippingProfileId: listing.shippingProfileId,
    };
    return (
      <Shell>
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href={listing.isDraft ? "/listings?tab=drafts" : `/listings/${listing.id}`}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> {listing.isDraft ? "Back to drafts" : "Back to listing"}
            </Link>
            {canDelete && (
              <ListingDeleteButton
                id={listing.id}
                title={listing.title || "Untitled draft"}
                redirectTo={listing.isDraft ? "/listings/drafts" : "/listings"}
              />
            )}
          </div>
          <h1 className="text-3xl font-bold">{listing.isDraft ? "Edit draft" : "Edit listing"}</h1>
          <ListingForm
            mode={listing.isDraft ? "draft" : "edit"}
            draftId={listing.isDraft ? listing.id : undefined}
            editId={listing.isDraft ? undefined : listing.id}
            initialData={initialData}
            templates={templates}
            shippingProfiles={shippingProfiles}
            accounts={accounts}
          />
        </div>
      </Shell>
    );
  }

  const hasActiveJobs = listing.jobs.some((j) => j.status === "PENDING" || j.status === "RUNNING");
  const failedPlatformListings = listing.platformListings.filter((pl) => pl.status === "FAILED");
  const liveElsewherePlatformListings = listing.platformListings.filter(
    (pl) => pl.status === "POSTED" || pl.status === "SOLD" || pl.status === "DELISTED"
  );

  const extensionListing = {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: Number(listing.price),
    quantity: listing.quantity,
    condition: listing.condition,
    category: listing.category,
    audience: listing.audience,
    brand: listing.brand,
    size: listing.size,
    color: listing.color,
    material: listing.material,
    sku: listing.sku,
    photos: listing.photos.map((p) => ({ id: p.id, url: p.url })),
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/listings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to listings
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/listings/${listing.id}?edit=1`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Link>
            <ListingDuplicateButton id={listing.id} />
            {canDelete && <ListingDeleteButton id={listing.id} title={listing.title} redirectTo="/listings" />}
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Below lg (single column), actionable/time-sensitive content -- the fix card,
              marketplace rows -- rises above the photo gallery and description; referential
              content sinks. At lg+ this is a no-op and DOM order (main body first) takes over. */}
          <div className="order-2 flex-1 space-y-6 lg:order-none">
            <div>
              <h1 className="text-3xl font-bold">{listing.title}</h1>
              <div className="flex items-center gap-2">
                <p className="tnum font-heading text-2xl font-semibold text-primary">{formatCurrency(listing.price)}</p>
                {listing.cost !== null && listing.cost !== undefined && listing.price > 0 && (
                  <p className="tnum text-sm text-muted-foreground">
                    Cost {formatCurrency(listing.cost)} · margin {(((listing.price - listing.cost) / listing.price) * 100).toFixed(0)}%
                  </p>
                )}
              </div>
              <div className="mt-2">
                <StatusPill status={computeListingStatus(listing)} />
              </div>
            </div>

            <ListingPhotoGallery photos={listing.photos} />

            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                <p><span className="font-medium text-foreground">Condition:</span> {listing.condition}</p>
                <p><span className="font-medium text-foreground">Category:</span> {listing.category}</p>
                {listing.brand && <p><span className="font-medium text-foreground">Brand:</span> {listing.brand}</p>}
                {listing.size && <p><span className="font-medium text-foreground">Size:</span> {listing.size}</p>}
                {listing.color && <p><span className="font-medium text-foreground">Color:</span> {listing.color}</p>}
                {listing.material && <p><span className="font-medium text-foreground">Material:</span> {listing.material}</p>}
                <p><span className="font-medium text-foreground">SKU:</span> {listing.sku || "—"}</p>
                <p><span className="font-medium text-foreground">Quantity:</span> <span className="tnum">{listing.quantity}</span></p>
                {listing.shippingProfile && <p><span className="font-medium text-foreground">Shipping:</span> {listing.shippingProfile.name}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{listing.description}</p>
              </CardContent>
            </Card>
          </div>

          <div className="order-1 w-full space-y-6 lg:order-none lg:w-96">
            {failedPlatformListings.length > 0 && (
              <div className="space-y-2">
                {failedPlatformListings.map((pl) => (
                  <FailedCrossPostCard
                    key={pl.id}
                    listingId={listing.id}
                    platform={pl.platform}
                    errorMessage={pl.errorMessage}
                    updatedAt={pl.updatedAt}
                    currentFields={{
                      size: listing.size ?? "",
                      category: listing.category ?? "",
                      condition: listing.condition ?? "",
                      brand: listing.brand ?? "",
                    }}
                    savedOverrides={pl.fieldOverrides}
                  />
                ))}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Publish</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {liveElsewherePlatformListings.length > 0 && (
                  <div className="-mx-6 divide-y border-b">
                    <p className="px-6 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Where it&apos;s live ·{" "}
                      {liveElsewherePlatformListings.filter((pl) => pl.status !== "DELISTED").length} of {listing.platformListings.length}
                    </p>
                    {liveElsewherePlatformListings.map((pl) => {
                      const price = pl.price ?? listing.price;
                      const overridden = pl.price !== null && pl.price !== listing.price;
                      return (
                        <div key={pl.id} className="flex items-center justify-between gap-3 px-6 py-3">
                          <div className="flex items-center gap-3">
                            <PlatformLogo platform={pl.platform} size={26} onDark />
                            <div>
                              <p className="text-sm font-medium">{getPlatform(pl.platform)?.name ?? pl.platform}</p>
                              <p className="tnum text-xs text-muted-foreground">
                                {formatCurrency(price)}
                                {overridden && ` (base ${formatCurrency(listing.price)})`}
                              </p>
                            </div>
                          </div>
                          {pl.externalUrl ? (
                            <a href={pl.externalUrl} target="_blank" rel="noopener noreferrer">
                              <Badge variant="live">{pl.status === "SOLD" ? "Sold" : "Live"}</Badge>
                            </a>
                          ) : (
                            <Badge variant={pl.status === "SOLD" || pl.status === "POSTED" ? "live" : "outline"}>
                              {pl.status === "DELISTED" ? "Delisted" : pl.status === "SOLD" ? "Sold" : pl.status}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <PublishPanel
                  listingId={listing.id}
                  accounts={accounts}
                  extensionListing={extensionListing}
                  hasActiveJobs={hasActiveJobs}
                  platformListings={listing.platformListings}
                  initialPublishedPlatforms={searchParams.published?.split(",").filter(Boolean)}
                />
              </CardContent>
            </Card>

            {listing.status !== "SOLD" && (
              <Card>
                <CardHeader>
                  <CardTitle>Inventory</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="tnum">{listing.quantity} in stock</span>
                  </div>
                  {listing.cost !== null && listing.cost !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Cost basis</span>
                      <span className="tnum">{formatCurrency(listing.cost * listing.quantity)}</span>
                    </div>
                  )}
                  <SoldButton
                    listingId={listing.id}
                    postedPlatforms={listing.platformListings.filter((pl) => pl.status === "POSTED").map((pl) => pl.platform)}
                  />
                </CardContent>
              </Card>
            )}

            {listing.status === "SOLD" && (
              <Card>
                <CardHeader>
                  <CardTitle>Sale summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(() => {
                    const sale = listing.platformListings.find((pl) => pl.profit !== null);
                    if (!sale) return <p className="text-muted-foreground">Profit not yet recorded.</p>;
                    const fees = sale.soldFees ?? 0;
                    const shipping = sale.soldShippingCost ?? 0;
                    const cost = listing.cost ?? 0;
                    const profit = sale.profit ?? 0;
                    return (
                      <>
                        <div className="flex justify-between"><span className="font-medium">Sold price</span><span className="tnum">{formatCurrency(sale.soldPrice ?? listing.price)}</span></div>
                        <div className="flex justify-between text-muted-foreground"><span>Fees</span><span className="tnum">{formatCurrency(-fees)}</span></div>
                        <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span className="tnum">{formatCurrency(-shipping)}</span></div>
                        <div className="flex justify-between text-muted-foreground"><span>Cost</span><span className="tnum">{formatCurrency(-cost)}</span></div>
                        <div className={cn("flex justify-between border-t pt-2 font-semibold", profit >= 0 ? "text-primary" : "text-destructive")}>
                          <span>Profit</span><span className="tnum">{formatCurrency(profit)}</span>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Activity</CardTitle>
                <span className="text-xs text-muted-foreground">Newest first</span>
              </CardHeader>
              <CardContent>
                <JobTimeline jobs={listing.jobs.slice(0, 10)} listingCreatedAt={listing.createdAt} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
