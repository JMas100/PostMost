"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteListing } from "@/lib/actions/listings";
import { Button } from "@/components/ui/button";

/** A single-listing delete -- the only place this existed before was the bulk-select checkbox
 *  flow on the main /listings table, which isn't where someone looking at one item, or at
 *  Inventory, would think to find it. */
export function ListingDeleteButton({
  id,
  title,
  variant = "outline",
  size = "sm",
  redirectTo,
}: {
  id: string;
  title: string;
  variant?: "outline" | "ghost" | "destructive";
  size?: "sm" | "icon";
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteListing(id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete this listing.");
        setConfirming(false);
        return;
      }
      toast.success(`Deleted "${title}"`);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Button
      variant={confirming ? "destructive" : variant}
      size={size}
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
      disabled={isPending}
      title={size === "icon" ? (confirming ? "Click again to confirm" : "Delete") : undefined}
    >
      <Trash2 className={size === "icon" ? "h-4 w-4" : "mr-1.5 h-3.5 w-3.5"} />
      {size !== "icon" && (isPending ? "Deleting…" : confirming ? "Click to confirm" : "Delete")}
    </Button>
  );
}
