"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How It Works" },
  { href: "#marketplaces", label: "Marketplaces" },
  { href: "#pricing", label: "Pricing" },
];

function HamburgerIcon() {
  return (
    <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-[5px]">
      <span className="h-[2px] w-5 rounded-full bg-[#090B0D]" />
      <span className="h-[2px] w-5 rounded-full bg-[#090B0D]" />
    </span>
  );
}

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const overlay = overlayRef.current;
    const focusable = overlay?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])'
    );
    focusable?.[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function resolveHref(href: string) {
    return href.startsWith("#") && pathname !== "/" ? `/${href}` : href;
  }

  return (
    <>
      <header
      className={cn(
        "sticky top-0 z-50 h-[58px] bg-[#F7F8FA]/90 backdrop-blur-[14px] lg:h-[72px] xl:h-[76px]",
        "border-b",
        scrolled ? "border-[#E5E7EB]" : "border-transparent"
      )}
      style={{ transitionProperty: "border-color", transitionDuration: "250ms" }}
    >
      <nav className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6 lg:px-[48px] xl:px-[80px]">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="h-[22px] w-[28px] lg:h-6 lg:w-[30px]" />
          <span className="font-heading text-[18px] font-bold tracking-[-0.02em] text-[#090B0D] lg:text-[19px]">
            PostMost
          </span>
        </Link>

        <div className="hidden items-center gap-[22px] lg:flex xl:gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={resolveHref(link.href)}
              className="text-[14px] font-medium text-[#68727D] transition-colors hover:text-[#090B0D] xl:text-[14.5px]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-5 lg:flex">
          <Link href="/login" className="text-[14px] font-medium text-[#68727D] transition-colors hover:text-[#090B0D] xl:text-[14.5px]">
            Log In
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-[#B6F34A] px-5 text-[14.5px] font-semibold text-[#090B0D] transition-colors hover:bg-[#c6f96c]"
          >
            Start Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          className="lg:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          <HamburgerIcon />
        </button>
      </nav>
      </header>

      {/* Rendered outside <header> — its backdrop-blur would otherwise become the
          containing block for this fixed-position overlay and confine it to the
          header's own box instead of the full viewport. */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="fixed inset-0 z-[60] flex flex-col bg-[#090B0D] px-6 py-4 lg:hidden"
          >
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                <LogoMark className="h-[22px] w-[28px]" />
                <span className="font-heading text-[18px] font-bold text-white">PostMost</span>
              </Link>
              <button
                className="flex h-11 w-11 shrink-0 items-center justify-center"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <span className="relative block h-5 w-5">
                  <span className="absolute left-1/2 top-1/2 h-[2px] w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-white" />
                  <span className="absolute left-1/2 top-1/2 h-[2px] w-5 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-white" />
                </span>
              </button>
            </div>

            <div className="mt-8 flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={resolveHref(link.href)}
                  onClick={() => setOpen(false)}
                  className="flex h-14 items-center font-heading text-[28px] font-bold text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-3 pb-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex h-[54px] items-center justify-center gap-2 rounded-[8px] bg-[#B6F34A] text-[15px] font-semibold text-[#090B0D]"
              >
                Start for free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex h-[54px] items-center justify-center rounded-[8px] border border-[#24282D] text-[15px] font-semibold text-white"
              >
                Log In
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
