"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setRelistConfig } from "@/lib/actions/automation";

const PILL_CLASS =
  "h-7 gap-1.5 rounded-lg border-border bg-muted/40 px-2.5 text-sm font-medium text-foreground hover:bg-muted/60";

/** "Relist after 30 days ... at most 20 a day" as two inline dropdowns inside the rule's own
 *  sentence, rather than a labelled Interval/Cap form below it -- the handoff's own stated reason
 *  is that a sentence with dropdowns in it reads as already-configured, where a form is something
 *  the user has to assemble in their head before they trust it. */
export function RelistConfigPills({
  staleDays,
  maxPerDay,
  staleDaysOptions,
  maxPerDayOptions,
}: {
  staleDays: number;
  maxPerDay: number;
  staleDaysOptions: readonly number[];
  maxPerDayOptions: readonly number[];
}) {
  const [values, setValues] = useState({ staleDays, maxPerDay });
  const [, startTransition] = useTransition();

  function update(next: { staleDays: number; maxPerDay: number }) {
    const prev = values;
    setValues(next);
    startTransition(async () => {
      const result = await setRelistConfig(next);
      if (result?.error) {
        setValues(prev);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>Relist after</span>
      <Select
        value={String(values.staleDays)}
        onValueChange={(v) => v && update({ ...values, staleDays: Number(v) })}
      >
        <SelectTrigger size="sm" className={PILL_CLASS}>
          <SelectValue>{values.staleDays} days</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {staleDaysOptions.map((d) => (
            <SelectItem key={d} value={String(d)}>
              {d} days
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>with no sale, at most</span>
      <Select
        value={String(values.maxPerDay)}
        onValueChange={(v) => v && update({ ...values, maxPerDay: Number(v) })}
      >
        <SelectTrigger size="sm" className={PILL_CLASS}>
          <SelectValue>{values.maxPerDay} a day</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {maxPerDayOptions.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n} a day
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
