import type { MasteryStatus } from "@/lib/mastery/mastery";
import { cn } from "@/lib/utils";

// How much of the ring is drawn. Shape, not just colour, tells them apart.
const arc: Record<MasteryStatus, number> = {
  new: 0,
  learning: 1 / 3,
  practicing: 2 / 3,
  mastered: 1,
};
const RADIUS = 7;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A small ring for a concept's mastery: empty and dashed (new), a third
 * (learning), two thirds (practicing), or filled with a tick (mastered).
 * Decorative: always pair it with the status as text.
 */
export function MasteryIcon({
  status,
  className,
}: {
  status: MasteryStatus;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      data-mastery={status}
      className={cn("size-4 shrink-0 text-tone", className)}
    >
      {status === "mastered" ? (
        <>
          <circle cx="10" cy="10" r="9" fill="currentColor" />
          <path
            d="M6 10.4 8.8 13 14 7.4"
            fill="none"
            stroke="var(--background)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <circle
            cx="10"
            cy="10"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            opacity={status === "new" ? 0.55 : 0.25}
            strokeDasharray={status === "new" ? "2.5 2.5" : undefined}
          />
          {arc[status] > 0 ? (
            <circle
              cx="10"
              cy="10"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${arc[status] * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              transform="rotate(-90 10 10)"
            />
          ) : null}
        </>
      )}
    </svg>
  );
}
