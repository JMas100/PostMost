"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { markRead } from "@/lib/actions/notifications";
import { KIND_ICON, CATEGORY_STYLE } from "@/lib/notification-display";
import type { NotificationCategory, NotificationKind } from "@/lib/notifications";

interface NotificationRowData {
  id: string;
  category: string;
  kind: string;
  title: string;
  body: string;
  actionLabel: string | null;
  actionHref: string | null;
  createdAt: Date;
}

export function NotificationRow({ notification: n }: { notification: NotificationRowData }) {
  const Icon = KIND_ICON[n.kind as NotificationKind];
  const style = CATEGORY_STYLE[n.category as NotificationCategory];

  return (
    <div className={cn("flex gap-3.5 border-b px-6 py-4 last:border-b-0 sm:px-7", style.row)}>
      <span className={cn("flex h-8 w-8 flex-none items-center justify-center rounded-lg", style.bg, style.icon)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm font-semibold">{n.title}</span>
          {n.category === "needs_you" && (
            <span className="flex h-5 items-center rounded-md bg-amber-500 px-1.5 text-[10.5px] font-bold text-black">
              NEEDS YOU
            </span>
          )}
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{n.body}</p>
      </div>
      <div className="flex flex-none flex-col items-end gap-2.5">
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {formatDistanceToNow(n.createdAt, { addSuffix: true })}
        </span>
        {n.actionLabel && n.actionHref && (
          <Link
            href={n.actionHref}
            onClick={() => {
              markRead(n.id).catch(() => {});
            }}
            className="flex h-[30px] items-center rounded-lg bg-primary px-3 text-xs font-semibold whitespace-nowrap text-primary-foreground"
          >
            {n.actionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
