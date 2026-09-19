import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { PlatformLogo } from "@/components/platform-logo";
import { getOrders } from "@/lib/actions/orders";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const orders = await getOrders();

  return (
    <Shell>
      <div className="space-y-6">
        <PageHeader title="Orders" description="Sales and fulfillment from every marketplace in one place." />

        {orders.length === 0 ? (
          <EmptyState
            variant="not-enough-data"
            headline="No orders yet"
            body="Sales from every connected marketplace arrive here, and the item is delisted from the others automatically."
            primaryAction={{ label: "See your live listings", href: "/listings" }}
          />
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {orders.map((order) => {
                const photo = order.listing?.photos[0]?.url;
                return (
                  <Link
                    key={order.id}
                    href={order.listing ? `/listings/${order.listing.id}` : "#"}
                    className="flex items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                    ) : (
                      <span className="h-10 w-10 shrink-0 rounded-md bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{order.listing?.title ?? "Deleted listing"}</p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <PlatformLogo platform={order.platform} size={14} onDark showLabel />
                        <span>·</span>
                        <span>{order.soldAt ? new Date(order.soldAt).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                    <div className="tnum shrink-0 text-right">
                      <p className="font-medium">{formatCurrency(order.soldPrice ?? 0)}</p>
                      <p className={order.profit != null && order.profit < 0 ? "text-xs text-destructive" : "text-xs text-success"}>
                        {formatCurrency(order.profit ?? 0)} profit
                      </p>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </Shell>
  );
}
