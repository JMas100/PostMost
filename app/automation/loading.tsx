import { Shell } from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AutomationLoading() {
  return (
    <Shell>
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-72" />
                </div>
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Card>
            <CardContent className="space-y-4 py-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between" style={{ opacity: 1 - i * 0.25 }}>
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
