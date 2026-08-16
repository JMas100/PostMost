"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Package, Settings, LogOut, Menu, CreditCard, Sparkles, FileText, LayoutTemplate, BarChart3, Upload, Truck, Users } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/listings", label: "Listings", icon: Package },
  { href: "/listings/import", label: "Import", icon: Upload },
  { href: "/listings/drafts", label: "Drafts", icon: FileText },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/pricing", label: "Pricing", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/settings/shipping", label: "Shipping", icon: Truck },
  { href: "/settings/team", label: "Team", icon: Users },
];

function NavContent({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="p-4 text-xl font-bold tracking-tight">PostMost</div>
      <nav className="flex-1 space-y-1 p-4">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href || pathname?.startsWith(item.href + "/")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4">
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <>
      <aside className="hidden w-64 border-r bg-card lg:block">
        <NavContent />
      </aside>
      <Sheet>
        <SheetTrigger className={cn(buttonVariants({ variant: "outline", size: "icon" }), "absolute left-4 top-4 lg:hidden")}>
          <Menu className="h-4 w-4" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <NavContent />
        </SheetContent>
      </Sheet>
    </>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-10">{children}</main>
    </div>
  );
}
