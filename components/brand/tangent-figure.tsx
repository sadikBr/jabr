/**
 * Decorative hero figure: y = x² with its tangent at x = 1.
 * Curve: screen (x, y) = (60 + 100·x, 220 − 45·x²) for x in [0, 2].
 * Tangent at x = 1 has slope 2, i.e. −90 screen units per 100 across.
 */
export function TangentFigure({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 320 250" role="img" aria-label={label} className="w-full">
      <g className="stroke-border" strokeWidth="1">
        {[40, 85, 130, 175, 220].map((y) => (
          <line key={y} x1="40" x2="290" y1={y} y2={y} />
        ))}
        {[60, 110, 160, 210, 260].map((x) => (
          <line key={x} y1="25" y2="220" x1={x} x2={x} />
        ))}
      </g>
      <g className="stroke-muted-foreground" strokeWidth="1.5">
        <line x1="40" x2="290" y1="220" y2="220" />
        <line x1="60" x2="60" y1="25" y2="235" />
      </g>
      {/* Quadratic Bézier through (0,0) and (2,4) with control at (1,0) is exactly y = x². */}
      <path
        d="M60 220 Q160 220 260 40"
        fill="none"
        className="stroke-primary"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <line
        x1="95"
        y1="233.5"
        x2="245"
        y2="98.5"
        className="stroke-accent"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle
        cx="160"
        cy="175"
        r="7"
        className="fill-accent stroke-card"
        strokeWidth="3"
      />
    </svg>
  );
}
