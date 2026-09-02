"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { Bell as BellIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNotifications, markAllRead, markRead } from "@/lib/actions/notifications";
import type { NotificationCategory, NotificationKind } from "@/lib/notifications";
import { KIND_ICON, CATEGORY_STYLE, EMPTY_COPY } from "@/lib/notification-display";

type NotificationRow = Awaited<ReturnType<typeof getNotifications>>[number];

const CATEGORIES: { key: NotificationCategory; label: string }[] = [
  { key: "needs_you", label: "Needs you" },
  { key: "sales", label: "Sales" },
  { key: "activity", label: "Activity" },
];

export function NotificationPanel({ onAction }: { onAction?: () => void }) {
  const [notifications, setNotifications] = useState<NotificationRow[] | null>(null);
  const [category, setCategory] = useState<NotificationCategory>("needs_you");
  const [, startTransition] = useTransition();

  const refresh = () => {
    getNotifications().then(setNotifications).catch(() => setNotifications([]));
  };

  useEffect(() => {
    refresh();
  }, []);

  const needsYouCount = notifications?.filter((n) => n.category === "needs_you").length ?? 0;
  const visible = notifications?.filter((n) => n.category === category) ?? [];

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllRead();
      refresh();
      onAction?.();
    });
  };

  const handleRowClick = (id: string) => {
    startTransition(async () => {
      await markRead(id);
      onAction?.();
    });
  };

  return (
    <div className="flex max-h-[75vh] w-[400px] flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3.5">
        <span className="text-sm font-semibold">Notifications</span>
        <button
          onClick={handleMarkAllRead}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Mark all read
        </button>
      </div>

      <div className="flex gap-1.5 border-b px-4 py-2.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={cn(
              "flex h-[26px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
              category === c.key
                ? "border border-primary bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {c.label}
            {c.key === "needs_you" && needsYouCount > 0 && (
              <span className="flex h-[15px] items-center rounded-[5px] bg-amber-500 px-1.5 text-[9.5px] font-bold text-black">
                {needsYouCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications === null ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="px-6 py-11 text-center">
            <div className="inline-flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-[26px] w-[26px] rounded-[7px] border bg-background" />
              ))}
            </div>
            <div className="mt-4 text-base font-semibold">{EMPTY_COPY[category].title}</div>
            <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{EMPTY_COPY[category].body}</div>
          </div>
        ) : (
          visible.map((n) => {
            const Icon = KIND_ICON[n.kind as NotificationKind] ?? BellIcon;
            const style = CATEGORY_STYLE[n.category as NotificationCategory];
            return (
              <div
                key={n.id}
                className={cn("flex gap-3 border-b px-4 py-3.5 last:border-b-0", style.row)}
              >
                <span className={cn("flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg", style.bg, style.icon)}>
                  <Icon className="h-[15px] w-[15px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold">{n.title}</div>
                  <div className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{n.body}</div>
                  {(n.actionLabel || n.secondaryActionLabel) && (
                    <div className="mt-2.5 flex items-center gap-2">
                      {n.actionLabel && n.actionHref && (
                        <Link
                          href={n.actionHref}
                          onClick={() => handleRowClick(n.id)}
                          className="flex h-7 items-center rounded-lg bg-primary px-2.5 text-xs font-semibold text-primary-foreground"
                        >
                          {n.actionLabel}
                        </Link>
                      )}
                      {n.secondaryActionLabel && n.secondaryActionHref && (
                        <Link
                          href={n.secondaryActionHref}
                          onClick={() => handleRowClick(n.id)}
                          className="flex h-7 items-center rounded-lg border px-2.5 text-xs font-medium"
                        >
                          {n.secondaryActionLabel}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
                <span className="flex-none text-[11.5px] text-muted-foreground">
                  {formatDistanceToNowStrict(n.createdAt, { addSuffix: true })}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t px-4 py-3 text-center">
        <Link href="/notifications" className="text-xs font-medium text-primary" onClick={() => onAction?.()}>
          See all notifications
        </Link>
      </div>
    </div>
  );
}
