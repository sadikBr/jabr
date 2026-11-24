import type { Subject } from "@/lib/content/vocabulary";
import { cn } from "@/lib/utils";

/** Deterministic pseudo-random numbers in [0, 1) from a string seed. */
function seeded(seed: string): () => number {
  let state = 2166136261;
  for (const char of seed) {
    state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  }
  return () => {
    state = Math.imul(state ^ (state >>> 15), 2246822507);
    state = Math.imul(state ^ (state >>> 13), 3266489909);
    return ((state ^= state >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Generative cover art: layered waves and a few "nodes", unique to each seed
 * and tinted by subject. Purely decorative.
 */
export function Cover({
  seed,
  subject,
  className,
}: {
  seed: string;
  subject: Subject;
  className?: string;
}) {
  const random = seeded(seed);
  const waves = Array.from({ length: 4 }, (_, i) => {
    const amplitude = 10 + random() * 22;
    const frequency = 0.012 + random() * 0.02;
    const phase = random() * Math.PI * 2;
    const base = 38 + i * 24 + random() * 10;
    const points = Array.from({ length: 41 }, (_, step) => {
      const x = step * 10;
      const y = base + amplitude * Math.sin(frequency * x + phase);
      return `${x},${y.toFixed(1)}`;
    });
    return { points: points.join(" "), opacity: 0.25 + i * 0.2 };
  });
  const nodes = Array.from({ length: 5 }, () => ({
    cx: 30 + random() * 340,
    cy: 20 + random() * 110,
    r: 3 + random() * 5,
  }));

  return (
    <div
      data-subject={subject}
      className={cn("overflow-hidden bg-tone-soft", className)}
    >
      <svg
        viewBox="0 0 400 150"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="size-full text-tone"
      >
        {waves.map((wave, i) => (
          <polyline
            key={i}
            points={wave.points}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity={wave.opacity}
          />
        ))}
        {nodes.map((node, i) => (
          <circle
            key={i}
            {...node}
            fill={i === 0 ? "var(--accent)" : "currentColor"}
            opacity={i === 0 ? 1 : 0.5}
          />
        ))}
      </svg>
    </div>
  );
}
