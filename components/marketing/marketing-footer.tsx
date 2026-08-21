import Link from "next/link";
import { LogoMark } from "@/components/logo";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Marketplaces", href: "#marketplaces" },
      { label: "Integrations", href: "#marketplaces" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Guides", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Contact", href: "mailto:hello@postmost.co" },
      { label: "Careers", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#24282D] bg-[#090B0D] pb-8 pt-12 lg:pb-10 lg:pt-[72px]">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-6 lg:px-[48px] xl:grid-cols-[300px_1fr] xl:gap-10 xl:px-[80px]">
        <div>
          <div className="flex items-center gap-2">
            <LogoMark className="h-[22px] w-[28px]" />
            <span className="font-heading text-[18px] font-bold text-white">PostMost</span>
          </div>
          <p className="mt-3 text-[14px] text-[#68727D]">Post once. Sell most.</p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white">{col.heading}</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-[14px] text-[#68727D] transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-[1440px] border-t border-[#24282D] px-6 pt-6 lg:px-[48px] xl:px-[80px]">
        <p className="text-[13px] text-[#68727D]">© {new Date().getFullYear()} PostMost. Built for resellers.</p>
      </div>
    </footer>
  );
}
