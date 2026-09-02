"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NotificationPanel } from "@/components/notification-panel";
import { getUnreadNeedsYouCount } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(() => {
    getUnreadNeedsYouCount()
      .then(setCount)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) refresh();
      }}
    >
      <PopoverTrigger
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          count > 0 ? "text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        aria-label={count > 0 ? `${count} notification${count === 1 ? "" : "s"} need attention` : "Notifications"}
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-lg border-2 border-sidebar bg-amber-500 px-1 text-[9.5px] font-bold leading-none text-black">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[400px] p-0">
        <NotificationPanel onAction={refresh} />
      </PopoverContent>
    </Popover>
  );
}
