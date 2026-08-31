"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Boxes,
  BarChart3,
  Zap,
  Store,
  Sparkles,
  CreditCard,
  Settings,
  LogOut,
  Plus,
  Menu,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Wordmark, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

// Orders is deliberately excluded: it needs marketplace sync that doesn't exist yet. Sold items
// surface via the "Sold" tab on Listings instead until real order sync lands.
const primaryNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/listings", label: "Listings", icon: Package },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/automation", label: "Automation", icon: Zap },
  { href: "/marketplaces", label: "Marketplaces", icon: Store },
];

const secondaryNav = [
  { href: "/pricing", label: "Pricing", icon: Sparkles },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string | null, href: string) {
  if (pathname === href) return true;
  if (href !== "/" && pathname?.startsWith(href + "/")) return true;
  return false;
}

function NavContent({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onClick}>
          <LogoMark className="h-8 w-8" />
          <Wordmark className="text-xl" />
        </Link>
        <ThemeToggle />
      </div>

      <div className="px-4 pb-2">
        <Link
          href="/listings/new"
          onClick={onClick}
          className={cn(buttonVariants({ size: "sm" }), "w-full gap-2")}
        >
          <Plus className="h-4 w-4" />
          Create listing
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-auto p-3">
        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-md border-l-2 py-2 pr-3 pl-[10px] text-sm font-medium transition-colors",
              isActive(pathname, item.href)
                ? "border-primary bg-sidebar-accent text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}

        <div className="my-3 border-t" />

        {secondaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-md border-l-2 py-2 pr-3 pl-[10px] text-sm font-medium transition-colors",
              isActive(pathname, item.href)
                ? "border-primary bg-sidebar-accent text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t p-3">
        <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}

function MobileTopBar() {
  return (
    <Sheet>
      <div className="flex h-14 flex-none items-center gap-3 border-b bg-background px-4 lg:hidden">
        <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <Link href="/dashboard" className="flex items-center gap-2">
          <LogoMark className="h-6 w-6" />
          <Wordmark className="text-lg" />
        </Link>
      </div>
      <SheetContent side="left" className="w-64 border-r bg-background p-0">
        <NavContent />
      </SheetContent>
    </Sheet>
  );
}

export function Sidebar() {
  return (
    <>
      <aside className="hidden w-64 flex-none border-r bg-background lg:block">
        <NavContent />
      </aside>
      <MobileTopBar />
    </>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell flex min-h-screen w-full flex-col bg-background font-sans text-foreground lg:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
    </div>
  );
}
