"use client";

import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBillingPortalSession } from "@/lib/actions/billing";

export function BillingPortalButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  function handleClick() {
    setError("");
    startTransition(async () => {
      const result = await createBillingPortalSession();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) {
        window.location.href = result.url;
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button type="button" variant="outline" disabled={isPending} onClick={handleClick}>
        {isPending ? "Loading..." : "Manage payment method"}
        {!isPending && <ExternalLink className="ml-2 h-3.5 w-3.5" />}
      </Button>
      <span className="text-xs text-muted-foreground">Invoices and receipts live in Stripe</span>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
