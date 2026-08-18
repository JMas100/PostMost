"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Wordmark, LogoMark } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Menu, X } from "lucide-react";

const navLinks = [
  { href: "#product", label: "Product" },
  { href: "#marketplaces", label: "Marketplaces" },
  { href: "/pricing", label: "Pricing" },
  { href: "#features", label: "Resources" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function resolveHref(href: string) {
    return href.startsWith("#") && pathname !== "/" ? `/${href}` : href;
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          <Wordmark className="text-xl" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={resolveHref(link.href)}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Log in
          </Link>
          <Link href="/login" className={cn(buttonVariants({ size: "sm" }), "gap-1")}>
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-t px-6 pb-4 md:hidden"
        >
          <div className="flex flex-col gap-4 pt-4">
            {navLinks.map((link) => (
              <Link key={link.href} href={resolveHref(link.href)} onClick={() => setOpen(false)} className="text-sm font-medium">
                {link.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="text-sm font-medium">
              Log in
            </Link>
            <Link href="/login" className={cn(buttonVariants(), "w-fit gap-1")} onClick={() => setOpen(false)}>
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      )}
    </header>
  );
}
