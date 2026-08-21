"use client";

import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const PLAN_NAMES = PLANS.map((p) => p.name);
const PRO_INDEX = PLANS.findIndex((p) => p.id === "pro");

type Row = { label: string; values: string[] };

const ROWS: Row[] = [
  { label: "New listings per month", values: ["25", "100", "300", "750", "2,000", "Unlimited"] },
  { label: "Active inventory", values: ["50", "500", "2,000", "5,000", "Unlimited", "Unlimited"] },
  { label: "Marketplaces", values: ["3", "5", "10+", "All", "All", "All"] },
  { label: "AI credits per month", values: ["10", "50", "100", "500", "5,000", "10,000"] },
  { label: "Studio-quality photo edits", values: ["—", "10", "50", "200", "1,000", "Unlimited"] },
  { label: "Automation", values: ["Manual", "Auto-delist", "Auto-relist", "Automated pricing", "Advanced", "Advanced"] },
  { label: "Team seats", values: ["—", "—", "—", "—", "3", "Unlimited"] },
  { label: "API access & webhooks", values: ["—", "—", "—", "—", "✓", "✓"] },
  { label: "Support", values: ["Help center", "Email", "Email", "Priority", "Onboarding", "Account manager"] },
];

function Cell({ value, isPro }: { value: string; isPro: boolean }) {
  if (value === "—") {
    return (
      <span aria-label="Not included" className="text-[#68727D]">
        —
      </span>
    );
  }
  return <span className={cn(isPro && "font-semibold")}>{value}</span>;
}

export function ComparisonTable() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-[48px] xl:px-[80px]">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h2 className="max-w-[620px] font-display text-[28px] font-bold leading-[1.15] tracking-[-0.03em] text-[#090B0D] xl:text-[34px]">
              What actually changes between plans.
            </h2>
            <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-[#68727D] xl:text-[16px]">
              The eight things resellers ask about most. Every plan includes crosslisting,
              inventory sync, and the mobile app.
            </p>
          </div>
          <a href="#contact" className="shrink-0 text-[14px] font-semibold text-[#090B0D] underline underline-offset-4">
            Need something else? Talk to sales
          </a>
        </div>

        {/* Tablet/desktop: real table, horizontally scrollable with a sticky label column */}
        <div className="mt-10 hidden overflow-x-auto rounded-[12px] border border-[#E5E7EB] lg:block">
          <table className="w-full min-w-[760px] border-collapse text-[13.5px]">
            <thead>
              <tr className="bg-[#F7F8FA]">
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-[#F7F8FA] px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.1em] text-[#68727D]"
                  style={{ width: 230 }}
                >
                  Compare
                </th>
                {PLANS.map((plan, i) => (
                  <th
                    key={plan.id}
                    scope="col"
                    className={cn(
                      "px-4 py-3 text-center text-[13px] font-semibold",
                      i === PRO_INDEX ? "bg-[#090B0D] text-[#B6F34A]" : "text-[#15181C]"
                    )}
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, ri) => (
                <tr key={row.label} className={ri % 2 === 1 ? "bg-[#FCFCFD]" : undefined}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-t border-[#E5E7EB] bg-inherit px-4 py-3 text-left font-medium text-[#15181C]"
                    style={{ width: 230, backgroundColor: ri % 2 === 1 ? "#FCFCFD" : "white" }}
                  >
                    {row.label}
                  </th>
                  {row.values.map((value, vi) => (
                    <td
                      key={PLAN_NAMES[vi]}
                      className={cn("border-t border-[#E5E7EB] px-4 py-3 text-center", vi === PRO_INDEX && "bg-[#FAFEF2] font-semibold")}
                    >
                      <Cell value={value} isPro={vi === PRO_INDEX} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: one accordion per feature row */}
        <div className="mt-8 lg:hidden">
          <Accordion defaultValue={["row-0"]}>
            {ROWS.map((row, ri) => (
              <AccordionItem key={row.label} value={`row-${ri}`} className="border-b border-[#E5E7EB] py-1">
                <AccordionTrigger className="py-4 text-[15px] font-semibold text-[#15181C] hover:no-underline">
                  {row.label}
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="flex flex-col gap-2 pb-2">
                    {row.values.map((value, vi) => (
                      <li
                        key={PLAN_NAMES[vi]}
                        className={cn(
                          "flex items-center justify-between rounded-[6px] px-2.5 py-1.5 text-[13.5px]",
                          vi === PRO_INDEX && "bg-[#FAFEF2]"
                        )}
                      >
                        <span className={cn("text-[#68727D]", vi === PRO_INDEX && "font-semibold text-[#090B0D]")}>
                          {PLAN_NAMES[vi]}
                        </span>
                        <Cell value={value} isPro={vi === PRO_INDEX} />
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
