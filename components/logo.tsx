import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading inline-flex items-baseline tracking-tight", className)}>
      <span className="font-light">post</span>
      <span className="font-extrabold">most</span>
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
      <circle cx="18" cy="24" r="5" className="fill-current" />
      <circle cx="34" cy="14" r="3" className="fill-current" />
      <circle cx="34" cy="34" r="3" className="fill-current" />
      <path
        d="M23 24L31 18M23 24L31 30"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M13 31V17"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
