import { Wordmark, LogoMark } from "@/components/logo";

export function MarketingFooter() {
  return (
    <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
      <div className="mb-2 flex items-center justify-center gap-2">
        <LogoMark className="h-5 w-5" />
        <Wordmark className="text-sm" />
      </div>
      © {new Date().getFullYear()} PostMost. Built for resellers.
    </footer>
  );
}
