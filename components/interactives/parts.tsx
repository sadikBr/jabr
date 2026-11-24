"use client";

import { PartyPopper } from "lucide-react";
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

/** Building blocks shared by the simulations, so they look and behave alike. */

export function Slider({
  label,
  valueText,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  label: string;
  /** The value as the learner should read it, e.g. "45°". */
  valueText: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="block text-sm font-medium">
      <span className="flex items-baseline justify-between gap-2">
        {label}
        <span className="font-mono text-base font-semibold text-foreground tabular-nums">
          {valueText}
        </span>
      </span>
      <input
        id={id}
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={valueText}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function Readout({
  label,
  value,
  highlight,
  testId,
}: {
  label: string;
  value: ReactNode;
  highlight?: boolean;
  testId?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        highlight ? "border-accent/50 bg-accent/15" : "bg-background",
      )}
    >
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        data-testid={testId}
        className="mt-0.5 font-mono text-lg font-semibold tabular-nums"
      >
        {value}
      </dd>
    </div>
  );
}

/** A small set of mutually exclusive choices, as radio buttons. */
export function Segmented<Value extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: Value;
  options: { value: Value; label: string }[];
  onChange: (value: Value) => void;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="inline-flex rounded-xl bg-muted p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
              value === option.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 text-sm font-medium",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className="relative h-7 w-12 shrink-0 rounded-full bg-input transition-colors peer-checked:bg-tone peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 after:absolute after:start-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5"
      />
      <span>
        {label}
        {hint ? (
          <span className="block text-xs font-normal text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function GoalBanner({
  reached,
  children,
}: {
  reached: boolean;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold",
        reached
          ? "animate-rise-in bg-success-soft text-success"
          : "bg-tone-soft text-tone",
      )}
    >
      {reached ? (
        <PartyPopper aria-hidden="true" className="size-5 shrink-0" />
      ) : null}
      {children}
    </p>
  );
}

/**
 * Tells the page that an interactive's goal has been met, once, by sending a
 * bubbling `jabr:goal` event from its root element. Lessons listen for it
 * to mark the activity done.
 */
export function useGoal(
  id: string,
): [RefObject<HTMLDivElement | null>, () => void] {
  const ref = useRef<HTMLDivElement>(null);
  const sent = useRef(false);
  const reach = useCallback(() => {
    if (sent.current) return;
    sent.current = true;
    ref.current?.dispatchEvent(
      new CustomEvent("jabr:goal", { bubbles: true, detail: { id } }),
    );
  }, [id]);
  return [ref, reach];
}

export function prefersReducedMotion(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Plays a clock from 0 to `duration` seconds of simulated time. With reduced
 * motion it jumps straight to the end, so the result is shown without movement.
 */
export function usePlayback(duration: number, timeScale = 1) {
  const [time, setTime] = useState<number | null>(null);
  const frame = useRef(0);

  const stop = useCallback(() => cancelAnimationFrame(frame.current), []);
  useEffect(() => stop, [stop]);

  const play = useCallback(
    (onEnd?: () => void) => {
      stop();
      if (prefersReducedMotion()) {
        setTime(duration);
        onEnd?.();
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = ((now - start) / 1000) * timeScale;
        if (elapsed >= duration) {
          setTime(duration);
          onEnd?.();
          return;
        }
        setTime(elapsed);
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    },
    [duration, timeScale, stop],
  );

  const reset = useCallback(() => {
    stop();
    setTime(null);
  }, [stop]);

  return { time, playing: time !== null && time < duration, play, reset };
}
