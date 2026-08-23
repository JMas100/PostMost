"use client";

import Link from "next/link";
import { CheckCircle2, PartyPopper } from "lucide-react";
import { Wordmark, LogoMark } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { MarketplaceAccountCard, type AccountView } from "@/components/marketplace-account-card";
import { cn } from "@/lib/utils";

const CONNECTABLE_PLATFORMS = PLATFORMS.filter((p) => p.authType !== "none");

const STEPS = [
  { step: 1, label: "Connect a marketplace" },
  { step: 2, label: "Publish your first listing" },
  { step: 3, label: "You're set" },
];

export function OnboardingWizard({ step, accounts }: { step: 1 | 2 | 3; accounts: AccountView[] }) {
  const accountByPlatform = new Map(accounts.map((a) => [a.platform, a]));

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <Wordmark className="text-xl" />
          </Link>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Skip for now
          </Link>
        </div>

        <ol className="mb-8 flex items-center gap-4">
          {STEPS.map((s, i) => (
            <li key={s.step} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-semibold",
                  s.step < step
                    ? "bg-primary text-primary-foreground"
                    : s.step === step
                    ? "border-2 border-primary text-primary"
                    : "border border-border text-muted-foreground"
                )}
              >
                {s.step < step ? <CheckCircle2 className="h-4 w-4" /> : s.step}
              </div>
              <span className={cn("hidden text-sm sm:inline", s.step === step ? "font-medium text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold">Connect your first marketplace</h1>
              <p className="text-muted-foreground">
                Link an account so your listings can go live. You can add more later.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {CONNECTABLE_PLATFORMS.map((platform) => (
                <MarketplaceAccountCard key={platform.id} platform={platform} account={accountByPlatform.get(platform.id)} />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" /> Marketplace connected
            </div>
            <div>
              <h1 className="text-2xl font-bold">Publish your first listing</h1>
              <p className="text-muted-foreground">
                Post an item once and it goes live everywhere you&apos;re connected.
              </p>
            </div>
            <Link href="/listings/new" className={buttonVariants({ size: "lg" })}>
              Create your first listing
            </Link>
            <p className="text-sm text-muted-foreground">
              <Link href="/dashboard" className="underline underline-offset-2 hover:text-foreground">
                I&apos;ll do this later — take me to my dashboard
              </Link>
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center">
            <PartyPopper className="mx-auto h-10 w-10 text-primary" />
            <h1 className="text-2xl font-bold">You&apos;re all set</h1>
            <p className="text-muted-foreground">
              Your first listing is live. Connect more marketplaces anytime from Marketplaces, and
              we&apos;ll keep everything in sync as items sell.
            </p>
            <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
              Go to my dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
