import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type EmptyStateVariant = "first-run" | "filtered" | "not-enough-data" | "failed";

interface EmptyStateAction {
  label: string;
  href: string;
  badge?: string;
}

interface EmptyStateProps {
  variant: EmptyStateVariant;
  headline: string;
  body: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

/**
 * Same anatomy for all four variants (dashed placeholder, three tile marks) —
 * only copy and actions change. Only "first-run" gets a lime primary action;
 * "filtered" should pass a "Clear filters" primaryAction, never a create action.
 */
export function EmptyState({ variant, headline, body, primaryAction, secondaryAction, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed py-11 px-8 text-center",
        variant === "failed" ? "border-destructive/40" : "border-border",
        className
      )}
    >
      <div className="mx-auto flex w-fit items-center gap-1.5">
        <span className="h-[26px] w-[26px] rounded-[7px] border border-border bg-muted" />
        <span className="h-[26px] w-[26px] rounded-[7px] border border-border bg-muted" />
        <span className="h-[26px] w-[26px] rounded-[7px] border border-border bg-muted" />
      </div>

      <p className="mt-4 text-base font-semibold text-foreground">{headline}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>

      {(primaryAction || secondaryAction) && (
        <div className="mt-5 flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:flex-wrap">
          {primaryAction && (
            <Link
              href={primaryAction.href}
              className={cn(
                buttonVariants({ variant: variant === "first-run" ? "default" : "outline", size: "marketing" }),
                "w-full gap-2 sm:w-auto"
              )}
            >
              {primaryAction.label}
              {primaryAction.badge && (
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                  {primaryAction.badge}
                </Badge>
              )}
            </Link>
          )}
          {secondaryAction && (
            <>
              {/* Desktop: equal-weight outline button. Mobile: side-by-side buttons read as equal
                  weight and neither gets tapped, so this collapses to a lime text link instead. */}
              <Link
                href={secondaryAction.href}
                className={cn(buttonVariants({ variant: "outline", size: "marketing" }), "hidden gap-2 sm:inline-flex")}
              >
                {secondaryAction.label}
                {secondaryAction.badge && (
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                    {secondaryAction.badge}
                  </Badge>
                )}
              </Link>
              <Link href={secondaryAction.href} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary sm:hidden">
                {secondaryAction.label}
                {secondaryAction.badge && (
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                    {secondaryAction.badge}
                  </Badge>
                )}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
