"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
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

const primaryNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/listings", label: "Listings", icon: Package },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
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
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive(pathname, item.href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive(pathname, item.href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
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

export function Sidebar() {
  return (
    <>
      <aside className="hidden w-64 border-r bg-background lg:block">
        <NavContent />
      </aside>
      <Sheet>
        <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "absolute left-4 top-4 lg:hidden")}>
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 border-r bg-background p-0">
          <NavContent />
        </SheetContent>
      </Sheet>
    </>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell flex min-h-screen w-full bg-background font-sans text-foreground">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-10">{children}</main>
    </div>
  );
}
