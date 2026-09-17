"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { duplicateListing } from "@/lib/actions/listings";
import { Button } from "@/components/ui/button";

export function ListingDuplicateButton({
  id,
  variant = "outline",
  size = "sm",
}: {
  id: string;
  variant?: "outline" | "ghost";
  size?: "sm" | "icon";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await duplicateListing(id);
      if ("error" in result && result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Couldn't duplicate this listing.");
        return;
      }
      toast.success("Listing duplicated");
      router.push(`/listings/${result.listing!.id}`);
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isPending}
      title={size === "icon" ? "Duplicate" : undefined}
    >
      <Copy className={size === "icon" ? "h-4 w-4" : "mr-1.5 h-3.5 w-3.5"} />
      {size !== "icon" && (isPending ? "Duplicating…" : "Duplicate")}
    </Button>
  );
}
