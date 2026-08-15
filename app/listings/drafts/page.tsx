import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export default async function DraftsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const drafts = await prisma.listing.findMany({
    where: { userId: session.user.id, isDraft: true },
    include: { photos: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Drafts</h1>
          <Link href="/listings/new" className={buttonVariants()}>
            New listing
          </Link>
        </div>

        {drafts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="mb-4">No drafts yet.</p>
              <Link href="/listings/new" className={buttonVariants()}>
                Create a draft
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {drafts.map((draft) => (
              <Card key={draft.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {draft.photos[0] ? (
                      <img src={draft.photos[0].url} alt="" className="h-20 w-20 rounded-md object-cover" />
                    ) : (
                      <div className="h-20 w-20 rounded-md bg-muted" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-1">{draft.title}</p>
                      <p className="text-sm text-muted-foreground">${draft.price.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Draft</p>
                      <Link href={`/listings/${draft.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        Continue editing
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
