"use client";

import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import { setCost } from "@/lib/actions/listings";
import { cn } from "@/lib/utils";

/**
 * A single cost cell, editable in place -- Tab/Enter commits and moves to the next row's cost
 * field (via data-cost-index, since native tab order would otherwise stop at every other
 * focusable thing in the row first), Esc reverts. Doubles as the "Add cost" affordance for rows
 * with no cost on file: there's no separate dedicated editor view, this cell IS it, reachable
 * whether you got here from the missing-cost filter, the banner, or just scrolling the table.
 */
export function InventoryCostCell({ id, initialCost, rowIndex }: { id: string; initialCost: number | null; rowIndex: number }) {
  const [value, setValue] = useState(initialCost !== null ? String(initialCost) : "");
  const [saved, setSaved] = useState(initialCost);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function focusNext() {
    const next = document.querySelector<HTMLInputElement>(`[data-cost-index="${rowIndex + 1}"]`);
    next?.focus();
    next?.select();
  }

  function commit(advance: boolean) {
    const trimmed = value.trim();
    if (trimmed === "") {
      // setCost has no "clear" mode -- revert rather than silently no-op on an empty field.
      setValue(saved !== null ? String(saved) : "");
      if (advance) focusNext();
      return;
    }
    const num = Number(trimmed);
    if (!Number.isFinite(num) || num < 0) {
      setValue(saved !== null ? String(saved) : "");
      if (advance) focusNext();
      return;
    }
    if (num === saved) {
      if (advance) focusNext();
      return;
    }
    startTransition(async () => {
      const result = await setCost(id, num);
      if ("error" in result) {
        setValue(saved !== null ? String(saved) : "");
      } else {
        setSaved(num);
      }
      if (advance) focusNext();
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      commit(true);
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(true);
    } else if (e.key === "Escape") {
      setValue(saved !== null ? String(saved) : "");
      inputRef.current?.blur();
    }
  }

  return (
    <input
      ref={inputRef}
      data-cost-index={rowIndex}
      type="number"
      step="0.01"
      min="0"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => commit(false)}
      placeholder="Add cost"
      disabled={isPending}
      className={cn(
        "w-24 rounded-sm border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none transition-colors hover:border-border focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30",
        saved === null ? "text-warning placeholder:text-warning/70" : "text-foreground"
      )}
    />
  );
}
