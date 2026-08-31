import type { ReactNode } from "react";

/** Standardizes what was seven slightly-different ad-hoc page headers (per the design audit's
 *  M7 finding) into one: sentence-case title, tracking-tight (the majority pattern already, and
 *  the crisper of the two), optional description line, optional right-aligned actions. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
