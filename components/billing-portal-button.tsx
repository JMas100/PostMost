"use client";

import { useState, useTransition } from "react";
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
    <div>
      <Button type="button" variant="outline" disabled={isPending} onClick={handleClick}>
        {isPending ? "Loading..." : "Manage billing"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
