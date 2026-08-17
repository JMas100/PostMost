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
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-brand-green", className)}
      aria-label="PostMost logo"
      {...props}
    >
      <image
        href="/logo-mark.png"
        x="0"
        y="0"
        width="240"
        height="240"
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  );
}
