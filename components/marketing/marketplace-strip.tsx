import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { PlatformMark } from "@/components/platform-logo";

const STRIP_ORDER = ["ebay", "poshmark", "mercari", "depop", "etsy", "whatnot", "grailed", "vinted", "shopify"];

export function MarketplaceStrip() {
  const markets = STRIP_ORDER.map((id) => PLATFORMS.find((p) => p.id === id)).filter(
    (p): p is (typeof PLATFORMS)[number] => !!p
  );

  return (
    <section id="marketplaces" className="border-y border-[#E5E7EB] bg-white py-14">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-x-10 lg:px-[80px]">
        <p className="shrink-0 text-[14px] font-medium text-[#68727D] lg:w-[230px] lg:text-[14.5px]">
          Sell where your customers already shop.
        </p>
        <div className="grid grid-cols-3 items-center justify-items-center gap-x-3 gap-y-[22px] lg:flex lg:flex-1 lg:flex-wrap lg:justify-between lg:gap-x-8 lg:gap-y-4">
          {markets.map((platform) => (
            <PlatformMark key={platform.id} platformId={platform.id} className="h-6 w-auto max-w-[90px]" />
          ))}
        </div>
      </div>
    </section>
  );
}
