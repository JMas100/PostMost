import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
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
    action: { label: "Connect", href: "/settings" },
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
    action: { label: "Connect", href: "/settings" },
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

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Finish setting up</p>
          <span className="text-xs font-medium text-muted-foreground">
            {doneCount} OF {ITEMS.length} DONE
          </span>
        </div>

        <div className="space-y-2">
          {ITEMS.map((item) => {
            const done = state[item.key];
            return (
              <div
                key={item.key}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3.5 py-3"
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 flex-none text-primary" />
                ) : (
                  <Circle className="h-5 w-5 flex-none text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{done ? item.doneLabel : item.hint}</p>
                </div>
                {!done && item.action && (
                  <Link href={item.action.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
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
