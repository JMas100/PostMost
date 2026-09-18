"use client";

import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { setCost } from "@/lib/actions/listings";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * A cost cell that reads as a formatted value (or a dashed "Add cost" target when empty) at rest,
 * and becomes a plain number input only while editing -- a bare `<input type=number>` at rest is
 * how this cell used to render "500" with browser spinner arrows next to Price's "$1000.00".
 * Click/Enter/Space opens it; Tab/Enter commits and moves to the next row (data-cost-index, since
 * native tab order would otherwise stop at other focusable things in the row first); Esc reverts.
 */
export function InventoryCostCell({ id, initialCost, rowIndex }: { id: string; initialCost: number | null; rowIndex: number }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialCost !== null ? String(initialCost) : "");
  const [saved, setSaved] = useState(initialCost);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function focusNext() {
    const next = document.querySelector<HTMLElement>(`[data-cost-index="${rowIndex + 1}"]`);
    next?.focus();
    next?.click();
  }

  function commit(advance: boolean) {
    const trimmed = value.trim();
    if (trimmed === "") {
      setValue(saved !== null ? String(saved) : "");
      setEditing(false);
      if (advance) focusNext();
      return;
    }
    const num = Number(trimmed);
    if (!Number.isFinite(num) || num < 0) {
      setValue(saved !== null ? String(saved) : "");
      setEditing(false);
      if (advance) focusNext();
      return;
    }
    if (num === saved) {
      setEditing(false);
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
      setEditing(false);
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
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(false)}
        disabled={isPending}
        className="w-24 rounded-sm border border-ring bg-background px-1.5 py-1 text-sm outline-none ring-2 ring-ring/30"
      />
    );
  }

  if (saved === null) {
    return (
      <button
        type="button"
        data-cost-index={rowIndex}
        onClick={() => setEditing(true)}
        className="inline-flex h-[26px] items-center rounded-md border border-dashed border-warning px-2 text-[12.5px] font-semibold text-warning outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        Add cost
      </button>
    );
  }

  return (
    <button
      type="button"
      data-cost-index={rowIndex}
      onClick={() => setEditing(true)}
      className={cn(
        "tnum rounded-sm px-1.5 py-1 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/30"
      )}
    >
      {formatCurrency(saved)}
    </button>
  );
}
