"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Shell } from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function InventoryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="font-semibold">We couldn&apos;t load your inventory</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Your items and costs are safe. This is a problem on our side.
            </p>
            <Button onClick={reset} className="mt-2">
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
