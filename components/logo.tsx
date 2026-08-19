import { useId } from "react";
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
  const gradientId = useId();

  return (
    <svg
      viewBox="80 50 1245 1003"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="PostMost logo"
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="249.5" y1="153.1" x2="654" y2="471">
          <stop offset="0" stopColor="#b6f34a" />
          <stop offset=".78" stopColor="#b6f34a" />
          <stop offset=".89" stopColor="#a0e82c" />
          <stop offset="1" stopColor="#629118" />
        </linearGradient>
      </defs>
      <g fill="none" strokeWidth="185" strokeLinecap="round" strokeLinejoin="round">
        <path stroke={`url(#${gradientId})`} d="M172.75,619.5 L172.75,190.4 A47.5,47.5 0 0 1 249.5,153.1 L731,532" />
        <path stroke="#b6f34a" d="M893,701 L1154.8,910.1 A47.5,47.5 0 0 0 1231.75,872.9 L1231.75,233.1 A47.5,47.5 0 0 0 1154.6,195.9 L194,959" />
      </g>
    </svg>
  );
}
