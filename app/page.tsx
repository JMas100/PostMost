import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, Layers, Zap, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/marketplaces/platforms";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-xl font-bold">PostMost</span>
        <div className="flex gap-3">
          <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
            Sign in
          </Link>
          <Link href="/login" className={buttonVariants()}>
            Get started
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-6 py-20 text-center lg:py-32">
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
            List once. Sell <span className="text-primary">everywhere.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            The reseller operating system that lets you create a single listing and cross-post it to eBay, Poshmark,
            Mercari, Depop, Facebook Marketplace, and more — with automatic inventory sync and delisting.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "inline-flex")}>
              Start free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="border-y bg-muted/40 px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-10 text-center text-2xl font-semibold">Supported marketplaces</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {PLATFORMS.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <div className="h-8 w-8 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-sm font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            <div className="space-y-3">
              <Layers className="h-8 w-8 text-primary" />
              <h3 className="text-xl font-semibold">One universal form</h3>
              <p className="text-muted-foreground">
                Enter your item details once. PostMost translates and publishes to each marketplace automatically.
              </p>
            </div>
            <div className="space-y-3">
              <Zap className="h-8 w-8 text-primary" />
              <h3 className="text-xl font-semibold">Auto-sync inventory</h3>
              <p className="text-muted-foreground">
                When an item sells on one platform, PostMost delists it everywhere else to prevent double selling.
              </p>
            </div>
            <div className="space-y-3">
              <Shield className="h-8 w-8 text-primary" />
              <h3 className="text-xl font-semibold">API + automation</h3>
              <p className="text-muted-foreground">
                Uses official APIs where available, with a secure automation engine for platforms without APIs.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} PostMost. Built for resellers.
      </footer>
    </div>
  );
}
