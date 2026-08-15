"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/lib/actions/billing";

export function PlanCheckoutButton({
  planId,
  children,
  variant = "default",
  className,
}: {
  planId: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary";
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  function handleClick() {
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("plan", planId);
      const result = await createCheckoutSession(formData);
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
    <div className={className}>
      <Button type="button" variant={variant} className="w-full" disabled={isPending} onClick={handleClick}>
        {isPending ? "Redirecting..." : children}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
