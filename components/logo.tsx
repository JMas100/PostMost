import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading inline-flex items-baseline tracking-tight", className)}>
      <span className="font-light text-foreground">post</span>
      <span className="font-extrabold text-primary">most</span>
    </span>
  );
}

export function LogoMark({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-brand-green", className)}
      aria-label="PostMost logo"
      {...props}
    >
      <rect width="48" height="48" rx="10" className="fill-brand-black" />
      <path
        d="M12 12L24 24L12 36"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 12L36 24L24 36"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
