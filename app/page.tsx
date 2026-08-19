"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HeroFlow } from "@/components/marketing/hero-flow";
import { SolutionFlow } from "@/components/marketing/solution-flow";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Marquee } from "@/components/marketing/marquee";
import { SpotlightCard } from "@/components/marketing/spotlight-card";
import { PlatformLogo } from "@/components/platform-logo";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { PLANS, formatPrice } from "@/lib/plans";
import {
  ArrowRight,
  Check,
  Camera,
  FileText,
  Tag,
  Type,
  AlignLeft,
  DollarSign,
  TrendingUp,
  Package,
  BarChart3,
  RotateCcw,
  RefreshCw,
  Layers,
  Code2,
  Webhook,
  Users,
} from "lucide-react";

const STRIP_ORDER = ["ebay", "poshmark", "mercari", "depop", "etsy", "whatnot", "grailed", "vinted", "shopify"];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

function MarketplaceStrip() {
  const markets = STRIP_ORDER.map((id) => PLATFORMS.find((p) => p.id === id)).filter(
    (p): p is (typeof PLATFORMS)[number] => !!p
  );
  return (
    <motion.section
      id="marketplaces"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={reveal}
      className="border-y bg-muted/40 py-10"
    >
      <p className="mb-6 text-center text-sm font-medium text-muted-foreground">
        Works with the marketplaces you already use
      </p>
      <Marquee>
        {markets.map((p) => (
          <PlatformLogo key={p.id} platformId={p.id} />
        ))}
      </Marquee>
    </motion.section>
  );
}

function AIPipeline() {
  const steps = [
    { icon: Camera, label: "Photo" },
    { icon: FileText, label: "Listing" },
    { icon: Tag, label: "Category" },
    { icon: Type, label: "Title" },
    { icon: AlignLeft, label: "Description" },
    { icon: DollarSign, label: "Pricing" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {steps.map((step, i) => (
        <motion.div
          key={step.label}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-3"
        >
          <div className="flex flex-col items-center gap-2 rounded-xl border bg-card px-5 py-4">
            <step.icon className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">{step.label}</span>
          </div>
          {i < steps.length - 1 && <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />}
        </motion.div>
      ))}
    </div>
  );
}

function PricingPreview() {
  const featured = ["launch", "grow", "pro"];
  const plans = featured.map((id) => PLANS.find((p) => p.id === id)).filter(Boolean);

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple pricing that scales with you</h2>
          <p className="mt-3 text-muted-foreground">Start free. Upgrade when you&apos;re ready to sell more.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isPro = plan!.id === "pro";
            return (
              <Card
                key={plan!.id}
                className={cn(
                  "flex flex-col",
                  isPro && "border-primary ring-1 ring-primary/20"
                )}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan!.name}</CardTitle>
                    {isPro && <Badge>Most popular</Badge>}
                  </div>
                  <div className="text-3xl font-bold">
                    {formatPrice(plan!.priceMonthly)}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan!.features.slice(0, 4).map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardContent>
                  <Link href="/pricing" className={cn(buttonVariants({ variant: isPro ? "default" : "outline" }), "w-full")}>
                    {isPro ? "Start with Pro" : "Choose " + plan!.name}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="marketing-light flex min-h-screen flex-col bg-background text-foreground">
      <MarketingNav />

      {/* Hero */}
      <section id="product" className="bg-blob-hero relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
          <motion.div initial="hidden" animate="visible" variants={reveal} transition={{ duration: 0.6 }} className="max-w-2xl">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Sell everywhere. Run it <span className="text-primary">like a business</span>.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              PostMost writes your listings with <span className="font-semibold text-foreground">AI</span>, publishes them to every marketplace you sell on, and keeps them <span className="font-semibold text-foreground">in sync automatically</span>—no copy, paste, or babysitting required.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
                Start for free <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-sm text-muted-foreground">No credit card required.</span>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative rounded-2xl border bg-card p-6 shadow-lifted"
          >
            <HeroFlow />
          </motion.div>
        </div>
      </section>

      <MarketplaceStrip />

      {/* Problem */}
      <motion.section
        id="problem"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={reveal}
        className="bg-blob-soft relative py-24"
      >
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Stop doing the same work six times.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            You list the same item, rewrite the same title, crop the same photos, and chase the same buyers across a dozen tabs. <span className="font-semibold text-foreground">Crosslisting shouldn&apos;t be a second job.</span>
          </p>

          <div className="mt-12 grid gap-6 text-left sm:grid-cols-3">
            {[
              { title: "Endless tabs", body: "Jumping between eBay, Poshmark, Mercari, Depop, Etsy, and more just to list once." },
              { title: "Copy-paste fatigue", body: "Titles, descriptions, photos, and pricing—retyped for every single marketplace." },
              { title: "Double-selling risk", body: "An item sells on one platform while it's still live on three others." },
            ].map((item) => (
              <SpotlightCard key={item.title} className="rounded-xl">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                  </CardContent>
                </Card>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Solution */}
      <motion.section
        id="solution"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={reveal}
        className="border-y bg-muted/40 py-24"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              One listing. Every marketplace.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Fill one form, upload once, and let PostMost publish everywhere your buyers already are.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "One universal listing form",
                "Automatic marketplace formatting",
                "One-click cross-post to every connected platform",
                "Live sync keeps inventory accurate everywhere",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <SolutionFlow />
        </div>
      </motion.section>

      {/* AI */}
      <motion.section
        id="ai"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={reveal}
        className="bg-blob-soft relative py-24"
      >
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Let AI do the busywork.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Still copying listings by hand? Upload a photo and PostMost builds the <span className="font-semibold text-foreground">category, title, description, and price</span> for you.
          </p>
          <div className="mt-12">
            <AIPipeline />
          </div>
        </div>
      </motion.section>

      {/* Automation */}
      <motion.section
        id="automation"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={reveal}
        className="border-y bg-muted/40 py-24"
      >
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Set it once. Let PostMost handle the rest.</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Your listings stay in sync so you can stop babysitting inventory.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: RotateCcw, title: "Delist", body: "Sold on one platform? Removed everywhere else automatically." },
              { icon: RefreshCw, title: "Relist", body: "Bring stale inventory back to the top with one click." },
              { icon: Layers, title: "Update", body: "Edit price, description, or photos and push the change everywhere." },
              { icon: TrendingUp, title: "Sync", body: "Stock levels and status stay consistent across every marketplace." },
            ].map((feature) => (
              <SpotlightCard key={feature.title} className="rounded-xl">
                <Card>
                  <CardHeader>
                    <feature.icon className="mb-2 h-6 w-6 text-primary" />
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.body}</p>
                  </CardContent>
                </Card>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Analytics */}
      <motion.section
        id="analytics"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={reveal}
        className="bg-blob-soft relative py-24"
      >
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Know what&apos;s actually making you money.</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Profit, inventory, sales, and marketplace performance—finally in one place.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: DollarSign, label: "Total profit", value: "$1,240", trend: "+12%" },
              { icon: Package, label: "Active inventory", value: "328", trend: "+8%" },
              { icon: BarChart3, label: "Sales this month", value: "47", trend: "+23%" },
              { icon: TrendingUp, label: "Top marketplace", value: "eBay", trend: "+18%" },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <stat.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                      <TrendingUp className="h-3 w-3" /> {stat.trend}
                    </span>
                  </div>
                  <CardTitle className="text-2xl">{stat.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Beyond crosslisting */}
      <motion.section
        id="platform"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={reveal}
        className="border-y bg-muted/40 py-24"
      >
        <div className="mx-auto max-w-5xl px-6">
          <div className="gradient-border-lime rounded-2xl p-8 shadow-medium sm:p-12">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built for growing resale businesses.</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                PostMost isn&apos;t just a crosslister you click through—it&apos;s <span className="font-semibold text-foreground">infrastructure your business can build on</span>.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: Code2,
                  title: "A real public API",
                  body: "Create and manage listings programmatically. Wire PostMost into your own tools instead of being boxed into ours.",
                },
                {
                  icon: Webhook,
                  title: "Real-time inventory webhooks",
                  body: "Signed webhooks let your POS, warehouse, or other systems tell PostMost the moment something sells—no polling, no delay.",
                },
                {
                  icon: Users,
                  title: "Team accounts with roles",
                  body: "Bring on staff with admin or member access. One shared inventory, not one login passed around.",
                },
              ].map((feature) => (
                <SpotlightCard key={feature.title} className="rounded-xl">
                  <Card>
                    <CardHeader>
                      <feature.icon className="mb-2 h-6 w-6 text-primary" />
                      <CardTitle className="text-base">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{feature.body}</p>
                    </CardContent>
                  </Card>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <PricingPreview />

      {/* Final CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={reveal}
        className="border-t bg-muted/40 py-24"
      >
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Your inventory deserves more buyers.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join resellers who list once and sell everywhere. Free forever to start.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
              Start selling free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </motion.section>

      <MarketingFooter />
    </div>
  );
}
