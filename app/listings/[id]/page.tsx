import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { requireWorkspace } from "@/lib/auth-helpers";
import { Shell } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobStatus } from "@/components/job-status";
import { ListingForm } from "@/components/listing-form";
import { getTemplates } from "@/lib/actions/templates";
import { getShippingProfiles } from "@/lib/actions/shipping";
import { getMarketplaceAccounts } from "@/lib/actions/accounts";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PublishPanel } from "@/components/publish-panel";
import { FailedCrossPostCard } from "@/components/publish-panel/failed-cross-post-card";
import { PlatformLogo } from "@/components/platform-logo";
import { getPlatform } from "@/lib/marketplaces/platforms";
import { SoldButton } from "./sold-button";

export default async function ListingDetailPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ published?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { workspaceUserId } = await requireWorkspace();

  const listing = await prisma.listing.findFirst({
    where: { id: params.id, userId: workspaceUserId },
    include: { photos: true, platformListings: true, shippingProfile: true, jobs: { orderBy: { createdAt: "desc" } } },
  });

  if (!listing) redirect("/listings");

  const templates = await getTemplates();
  const shippingProfiles = await getShippingProfiles();
  const accounts = await getMarketplaceAccounts();

  if (listing.isDraft) {
    const initialData: Record<string, unknown> = {
      ...listing,
      photos: listing.photos.map((p) => p.url),
      shippingProfileId: listing.shippingProfileId,
    };
    return (
      <Shell>
        <div className="mx-auto max-w-2xl space-y-4">
          <Link href="/listings?tab=drafts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to drafts
          </Link>
          <h1 className="text-3xl font-bold">Edit draft</h1>
          <ListingForm mode="draft" draftId={listing.id} initialData={initialData} templates={templates} shippingProfiles={shippingProfiles} accounts={accounts} />
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
        <Link href="/listings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to listings
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1 space-y-6">
            <div>
              <h1 className="text-3xl font-bold">{listing.title}</h1>
              <p className="text-2xl font-semibold text-primary">${listing.price.toFixed(2)}</p>
              {listing.cost !== null && listing.cost !== undefined && (
                <p className="text-sm text-muted-foreground">Cost: ${listing.cost.toFixed(2)}</p>
              )}
              <Badge variant={listing.status === "ACTIVE" ? "default" : "secondary"} className="mt-2">
                {listing.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">Condition:</span> {listing.condition}</p>
              <p><span className="font-medium text-foreground">Category:</span> {listing.category}</p>
              {listing.brand && <p><span className="font-medium text-foreground">Brand:</span> {listing.brand}</p>}
              {listing.size && <p><span className="font-medium text-foreground">Size:</span> {listing.size}</p>}
              {listing.color && <p><span className="font-medium text-foreground">Color:</span> {listing.color}</p>}
              {listing.material && <p><span className="font-medium text-foreground">Material:</span> {listing.material}</p>}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{listing.description}</p>
              </CardContent>
            </Card>

            <div>
              <h2 className="mb-3 text-xl font-semibold">Photos</h2>
              <div className="grid grid-cols-3 gap-3">
                {listing.photos.map((photo) => (
                  <img key={photo.id} src={photo.url} alt="" className="aspect-square rounded-md object-cover" />
                ))}
              </div>
            </div>
          </div>

          <div className="w-full space-y-6 lg:w-96">
            {failedPlatformListings.length > 0 && (
              <div className="space-y-2">
                {failedPlatformListings.map((pl) => (
                  <FailedCrossPostCard
                    key={pl.id}
                    listingId={listing.id}
                    platform={pl.platform}
                    errorMessage={pl.errorMessage}
                    updatedAt={pl.updatedAt}
                  />
                ))}
              </div>
            )}

            {liveElsewherePlatformListings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Where it&apos;s live ·{" "}
                    {liveElsewherePlatformListings.filter((pl) => pl.status !== "DELISTED").length} of {listing.platformListings.length}
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y p-0">
                  {liveElsewherePlatformListings.map((pl) => {
                    const price = pl.price ?? listing.price;
                    const overridden = pl.price !== null && pl.price !== listing.price;
                    return (
                      <div key={pl.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <PlatformLogo platform={pl.platform} size={26} />
                          <div>
                            <p className="text-sm font-medium">{getPlatform(pl.platform)?.name ?? pl.platform}</p>
                            <p className="text-xs text-muted-foreground">
                              ${price.toFixed(2)}
                              {overridden && ` (base $${listing.price.toFixed(2)})`}
                            </p>
                          </div>
                        </div>
                        {pl.externalUrl ? (
                          <a href={pl.externalUrl} target="_blank" rel="noopener noreferrer">
                            <Badge variant="success">{pl.status === "SOLD" ? "Sold" : "Live"}</Badge>
                          </a>
                        ) : (
                          <Badge variant={pl.status === "SOLD" ? "success" : "outline"}>
                            {pl.status === "DELISTED" ? "Delisted" : pl.status === "SOLD" ? "Sold" : pl.status}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Publish</CardTitle>
              </CardHeader>
              <CardContent>
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
                <CardContent>
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
                    return (
                      <>
                        <p><span className="font-medium">Sold price:</span> ${(sale.soldPrice ?? listing.price).toFixed(2)}</p>
                        <p><span className="font-medium">Fees:</span> ${(sale.soldFees ?? 0).toFixed(2)}</p>
                        <p><span className="font-medium">Shipping:</span> ${(sale.soldShippingCost ?? 0).toFixed(2)}</p>
                        <p><span className="font-medium">Cost:</span> ${(listing.cost ?? 0).toFixed(2)}</p>
                        <p className="font-semibold">Profit: ${(sale.profit ?? 0).toFixed(2)}</p>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {listing.jobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  listing.jobs.slice(0, 10).map((job) => <JobStatus key={job.id} job={job} />)
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
