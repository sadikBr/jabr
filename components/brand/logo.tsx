import { brandMark } from "@/lib/brand";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  const { stem, stemWidth, dot, colors } = brandMark;
  return (
    <svg
      viewBox={brandMark.viewBox}
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <defs>
        <linearGradient id="jabr-mark-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={colors.backgroundFrom} />
          <stop offset="1" stopColor={colors.backgroundTo} />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill="url(#jabr-mark-bg)" />
      <path
        d={stem}
        fill="none"
        stroke={colors.stem}
        strokeWidth={stemWidth}
        strokeLinecap="round"
      />
      <circle cx={dot.cx} cy={dot.cy} r={dot.r} fill={colors.dot} />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">{site.name}</span>
    </span>
  );
}
