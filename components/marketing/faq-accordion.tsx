"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { reveal } from "@/components/marketing/motion-primitives";

const FAQS = [
  {
    q: "Can I start for free?",
    a: "Yes. The free plan lets you create listings and publish to two marketplaces, with no credit card required. Upgrade when you need more volume.",
  },
  {
    q: "Which marketplaces does PostMost support?",
    a: "eBay, Poshmark, Mercari, Depop, Etsy, Whatnot, Grailed, Vinted, and Shopify. Your plan determines how many you can connect at once.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. PostMost runs in your browser. Connect your marketplace accounts once and publish from anywhere you're signed in.",
  },
  {
    q: "How does cross-posting work?",
    a: "You fill in one listing. PostMost translates it into each marketplace's own format—categories, attributes, shipping—and queues the publish for every destination you selected.",
  },
  {
    q: "What happens if one marketplace fails?",
    a: "The rest stay published. PostMost retries automatically, and if the marketplace needs something specific it tells you exactly what to fix—you don't start the listing over.",
  },
  {
    q: "Is my inventory synchronized?",
    a: "Yes. When an item sells on one marketplace, PostMost removes it from the others so you don't double-sell. Price and description edits push everywhere too.",
  },
  {
    q: "Can I upgrade later?",
    a: "Any time, and your listings come with you. Moving up a plan raises your limits immediately—nothing is rebuilt or re-published.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account settings and you keep access until the end of the billing period.",
  },
];

export function FaqAccordion() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={reveal}
      className="bg-[#F7F8FA] py-[72px] lg:py-[120px]"
    >
      <div className="mx-auto grid max-w-[1280px] gap-8 px-6 lg:grid-cols-[380px_1fr] lg:gap-20 lg:px-[80px]">
        <div>
          <h2 className="font-display text-[32px] font-bold leading-[1.12] tracking-[-0.03em] text-[#090B0D] lg:text-[46px] lg:leading-[1.05]">
            Questions, answered.
          </h2>
          <p className="mt-4 hidden text-[16px] text-[#68727D] lg:block">
            Still unsure about something?{" "}
            <Link href="mailto:hello@postmost.co" className="font-semibold text-[#090B0D] underline underline-offset-4">
              Talk to us
            </Link>
            .
          </p>
        </div>

        <Accordion defaultValue={["item-0"]}>
          {FAQS.map((faq, i) => (
            <AccordionItem
              key={faq.q}
              value={`item-${i}`}
              className="border-b border-[#E5E7EB] py-1"
            >
              <AccordionTrigger className="py-5 text-[16px] font-semibold text-[#15181C] hover:no-underline lg:py-[22px] lg:text-[17px]">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="pr-6 text-[15px] leading-[1.65] lg:pr-[60px] lg:text-[15.5px] text-[#68727D]">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="text-[16px] text-[#68727D] lg:hidden">
          Still unsure about something?{" "}
          <Link href="mailto:hello@postmost.co" className="font-semibold text-[#090B0D] underline underline-offset-4">
            Talk to us
          </Link>
          .
        </p>
      </div>
    </motion.section>
  );
}
