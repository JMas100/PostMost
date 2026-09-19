import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActivationState } from "@/lib/actions/activation";

interface ChecklistItem {
  key: keyof Omit<ActivationState, "complete">;
  label: string;
  doneLabel: string;
  hint: string;
  action?: { label: string; href: string };
}

const ITEMS: ChecklistItem[] = [
  {
    key: "connectedAny",
    label: "Connect a marketplace",
    doneLabel: "Connected",
    hint: "Link an account so your listings can go live.",
    action: { label: "Connect", href: "/marketplaces" },
  },
  {
    key: "publishedFirst",
    label: "Publish your first listing",
    doneLabel: "Published",
    hint: "Post an item once and it goes live everywhere you sell.",
    action: { label: "Create listing", href: "/listings/new" },
  },
  {
    key: "connectedSecond",
    label: "Connect a second marketplace",
    doneLabel: "Connected",
    hint: "Sellers on more marketplaces reach more buyers.",
    action: { label: "Connect", href: "/marketplaces" },
  },
  {
    key: "soldFirst",
    label: "Make your first sale",
    doneLabel: "Delisted automatically",
    hint: "When it sells anywhere, we remove it everywhere else — automatic, nothing to set up.",
  },
];

export function ActivationChecklist({ state }: { state: ActivationState }) {
  if (state.complete) return null;

  const doneCount = ITEMS.filter((item) => state[item.key]).length;
  // Only the next undone step gets a solid CTA -- every row having an equally loud button would
  // just be noise about which one to actually click next.
  const nextKey = ITEMS.find((item) => !state[item.key])?.key;

  return (
    <Card className="border-primary/25 bg-primary/[0.03]">
      <CardContent className="space-y-4 py-5">
        <div className="flex items-center justify-between gap-4">
          <p className="font-semibold">Finish setting up</p>
          <Badge variant="live" className="shrink-0 tnum border-primary/30 bg-primary/10 text-primary">
            {doneCount} OF {ITEMS.length} DONE
          </Badge>
        </div>

        <Progress value={(doneCount / ITEMS.length) * 100} />

        <div className="space-y-2">
          {ITEMS.map((item) => {
            const done = state[item.key];
            return (
              <div
                key={item.key}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3.5 py-3"
              >
                {done ? (
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                ) : (
                  <Circle className="h-5 w-5 flex-none text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{done ? item.doneLabel : item.hint}</p>
                </div>
                {!done && item.action && (
                  <Link
                    href={item.action.href}
                    className={buttonVariants({ variant: item.key === nextKey ? "default" : "outline", size: "sm" })}
                  >
                    {item.action.label}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
