"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "What's an AI credit?",
    a: "One credit covers one AI-assisted action—generating a title and description from a photo, or getting a pricing suggestion. Credits reset with your billing cycle and don't roll over.",
  },
  {
    q: "What happens when I hit my monthly limit?",
    a: "New listings pause until your limit resets or you upgrade. Nothing already published is affected, and you can still edit, delist, or relist existing inventory.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. Upgrades apply immediately and are prorated for the rest of your billing cycle. Downgrades take effect at the start of your next cycle, so you keep your current limits until then.",
  },
  {
    q: "How does annual billing work?",
    a: "Pay for ten months, get twelve. If you switch from monthly to annual mid-cycle, the remaining balance on your monthly plan is applied as credit toward the annual charge.",
  },
  {
    q: "Do I need a credit card to start?",
    a: "No. The Free plan never asks for one. You'll only enter billing details when you choose a paid plan.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account settings and you keep access until the end of the billing period you already paid for.",
  },
];

export function PricingFaq() {
  return (
    <section className="bg-[#F7F8FA] py-24">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-6 lg:px-[48px] xl:grid-cols-[340px_1fr] xl:gap-20 xl:px-[80px]">
        <div>
          <h2 className="font-display text-[28px] font-bold leading-[1.15] tracking-[-0.03em] text-[#090B0D] xl:text-[38px]">
            Billing questions.
          </h2>
          <p className="mt-3 text-[15px] text-[#68727D] xl:text-[16px]">Everything else is in the help center.</p>
        </div>

        <Accordion defaultValue={["item-0"]}>
          {FAQS.map((faq, i) => (
            <AccordionItem key={faq.q} value={`item-${i}`} className="border-b border-[#E5E7EB] py-1">
              <AccordionTrigger className="py-5 text-[16px] font-semibold text-[#15181C] hover:no-underline xl:py-[22px] xl:text-[17px]">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="pr-6 text-[15px] leading-[1.65] text-[#68727D] xl:pr-[60px] xl:text-[15.5px]">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
