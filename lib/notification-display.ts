import { AlertTriangle, LogOut, Gauge, DollarSign, Zap, CheckCircle2 } from "lucide-react";
import type { NotificationCategory, NotificationKind } from "@/lib/notifications";

export const KIND_ICON: Record<NotificationKind, typeof AlertTriangle> = {
  cross_post_failed: AlertTriangle,
  marketplace_signed_out: LogOut,
  near_plan_limit: Gauge,
  item_sold: DollarSign,
  automation_ran: Zap,
  cross_post_succeeded: CheckCircle2,
};

export const CATEGORY_STYLE: Record<NotificationCategory, { icon: string; bg: string; row: string }> = {
  needs_you: { icon: "text-amber-500", bg: "bg-amber-500/15", row: "bg-amber-500/5" },
  sales: { icon: "text-green-500", bg: "bg-green-500/15", row: "" },
  activity: { icon: "text-primary", bg: "bg-primary/10", row: "opacity-70" },
};

export const EMPTY_COPY: Record<NotificationCategory, { title: string; body: string }> = {
  needs_you: {
    title: "Nothing needs you",
    body: "Every listing is where it should be. We'll tell you when something sells or a marketplace pushes back.",
  },
  sales: { title: "No sales yet", body: "Sold listings will show up here." },
  activity: { title: "Nothing here yet", body: "Automation runs and successful cross-posts will show up here." },
};
