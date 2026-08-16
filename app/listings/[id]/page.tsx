import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformBadge } from "@/components/platform-badge";
import { JobStatus } from "@/components/job-status";
import { ListingForm } from "@/components/listing-form";
import { getTemplates } from "@/lib/actions/templates";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CrossPostForm from "./cross-post-form";
import { ExtensionPublisher } from "./extension-publisher";
import { SoldButton } from "./sold-button";

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const listing = await prisma.listing.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { photos: true, platformListings: true, jobs: { orderBy: { createdAt: "desc" } } },
  });

  if (!listing) redirect("/listings");

  const templates = await getTemplates();

  if (listing.isDraft) {
    const initialData: Record<string, unknown> = {
      ...listing,
      photos: listing.photos.map((p) => p.url),
    };
    return (
      <Shell>
        <div className="mx-auto max-w-2xl space-y-4">
          <Link href="/listings/drafts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to drafts
          </Link>
          <h1 className="text-3xl font-bold">Edit draft</h1>
          <ListingForm mode="draft" draftId={listing.id} initialData={initialData} templates={templates} />
        </div>
      </Shell>
    );
  }

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
            <Card>
              <CardHeader>
                <CardTitle>Cross-post</CardTitle>
              </CardHeader>
              <CardContent>
                <CrossPostForm listingId={listing.id} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Browser extension</CardTitle>
              </CardHeader>
              <CardContent>
                <ExtensionPublisher listing={extensionListing} />
              </CardContent>
            </Card>

            {listing.status !== "SOLD" && (
              <Card>
                <CardHeader>
                  <CardTitle>Inventory</CardTitle>
                </CardHeader>
                <CardContent>
                  <SoldButton listingId={listing.id} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Platform status</CardTitle>
              </CardHeader>
              <CardContent>
                {listing.platformListings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not posted anywhere yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {listing.platformListings.map((pl) => (
                      <PlatformBadge key={pl.id} platform={pl.platform} status={pl.status} externalUrl={pl.externalUrl} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

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
