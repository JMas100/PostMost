import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Thousands separators and a minus sign before the currency symbol on negatives (Intl's
 *  default en-US currency formatting already does both) -- `${value.toFixed(2)}` string
 *  interpolation gets neither, which is how $21250.00 and $-8750.00 make it to the page. */
export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}
