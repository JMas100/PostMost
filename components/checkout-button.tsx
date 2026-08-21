"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createCheckoutSession } from "@/lib/actions/billing";

export function PlanCheckoutButton({
  planId,
  interval = "month",
  children,
  variant = "default",
  className,
  buttonClassName,
}: {
  planId: string;
  interval?: "month" | "year";
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary";
  className?: string;
  /** Applied to the underlying <button> itself, layered on top of buttonVariants. */
  buttonClassName?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  function handleClick() {
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("plan", planId);
      formData.set("interval", interval);
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
      <Button type="button" variant={variant} className={cn("w-full", buttonClassName)} disabled={isPending} onClick={handleClick}>
        {isPending ? "Redirecting..." : children}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
