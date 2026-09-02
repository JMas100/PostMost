"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { markAllRead } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

export function NotificationsActions() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() =>
          startTransition(async () => {
            await markAllRead();
            router.refresh();
          })
        }
        disabled={isPending}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Mark all read
      </button>
      <Link href="/settings/notifications" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        Preferences
      </Link>
    </div>
  );
}
