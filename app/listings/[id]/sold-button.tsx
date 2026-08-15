"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markListingSold } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";

export function SoldButton({ listingId, disabled }: { listingId: string; disabled?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await markListingSold(listingId);
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage("Marked as sold. Auto-delisting attempted for connected platforms.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" className="w-full" disabled={disabled || isPending} onClick={handleClick}>
        {isPending ? "Marking..." : "Mark as sold"}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
