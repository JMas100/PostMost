"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";
import { ArrowRight, Menu, X } from "lucide-react";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How It Works" },
  { href: "#marketplaces", label: "Marketplaces" },
  { href: "#pricing", label: "Pricing" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function resolveHref(href: string) {
    return href.startsWith("#") && pathname !== "/" ? `/${href}` : href;
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-[76px] bg-[#F7F8FA]/90 backdrop-blur-[14px]",
        "border-b",
        scrolled ? "border-[#E5E7EB]" : "border-transparent"
      )}
      style={{ transitionProperty: "border-color", transitionDuration: "250ms" }}
    >
      <nav className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6 lg:px-[80px]">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="h-6 w-[30px]" />
          <span className="font-heading text-[19px] font-bold tracking-[-0.02em] text-[#090B0D]">PostMost</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={resolveHref(link.href)}
              className="text-[14.5px] font-medium text-[#68727D] transition-colors hover:text-[#090B0D]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-5 md:flex">
          <Link href="/login" className="text-[14.5px] font-medium text-[#68727D] transition-colors hover:text-[#090B0D]">
            Log In
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-[#B6F34A] px-5 text-[14.5px] font-semibold text-[#090B0D] transition-colors hover:bg-[#c6f96c]"
          >
            Start Free <ArrowRight className="h-4 w-4" />
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
          className="border-t border-[#E5E7EB] bg-[#F7F8FA] px-6 pb-4 md:hidden"
        >
          <div className="flex flex-col gap-4 pt-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={resolveHref(link.href)}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-[#090B0D]"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="text-sm font-medium text-[#090B0D]">
              Log In
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="inline-flex h-11 w-fit items-center gap-2 rounded-[8px] bg-[#B6F34A] px-5 text-[14.5px] font-semibold text-[#090B0D]"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      )}
    </header>
  );
}
