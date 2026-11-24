"use client";

import { Check, CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { InteractiveProps } from "@/lib/content/interactive-specs";
import { magnitude } from "@/lib/maths/vectors";
import {
  checkDiagram,
  type ForceId,
  forceIds,
  forceVector,
  netForce,
  type Situation,
  type SituationId,
  situations,
} from "@/lib/sim/free-body";
import { cn } from "@/lib/utils";

import { Segmented, useGoal } from "./parts";
import { Arrow, Plot, type PlotView } from "./plot";

/** Arrows are drawn a little shorter than their true size, to fit the frame. */
const ARROW_SCALE = 0.8;
/** Arrows that point the same way are drawn side by side, this far apart. */
const SIDE_STEP = 12;

interface Attempt {
  chosen: ForceId[];
  /** The result of the last check, until the choice changes. */
  checked: ReturnType<typeof checkDiagram> | null;
}
const blank: Attempt = { chosen: [], checked: null };

/** The object, and what it rests on, drawn around the origin. */
function Body({
  situation,
  view: { scale },
}: {
  situation: Situation;
  view: PlotView;
}) {
  const x = scale.toX(0);
  const y = scale.toY(0);
  const unit = scale.toX(1) - scale.toX(0);
  const tilt = typeof situation.surface === "number" ? situation.surface : 0;
  const half = { w: unit * 0.22, h: unit * 0.15 };
  return (
    // SVG angles run clockwise, so a slope rising to the right is negative.
    <g transform={`rotate(${-tilt} ${x} ${y})`}>
      {situation.surface !== "none" ? (
        <line
          x1={x - unit * 3}
          x2={x + unit * 3}
          y1={y + half.h + 2}
          y2={y + half.h + 2}
          className="stroke-muted-foreground"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ) : null}
      {situation.shape === "box" ? (
        <rect
          x={x - half.w}
          y={y - half.h}
          width={half.w * 2}
          height={half.h * 2}
          rx="5"
          className="fill-tone-soft stroke-tone"
          strokeWidth="2.5"
        />
      ) : situation.shape === "ball" ? (
        <circle
          cx={x}
          cy={y}
          r={unit * 0.17}
          className="fill-tone-soft stroke-tone"
          strokeWidth="2.5"
        />
      ) : (
        <path
          d={`M${x} ${y - unit * 0.336} Q${x + unit * 0.128} ${y - unit * 0.16} ${x + unit * 0.104} ${y + unit * 0.192} L${x + unit * 0.192} ${y + unit * 0.288} H${x - unit * 0.192} L${x - unit * 0.104} ${y + unit * 0.192} Q${x - unit * 0.128} ${y - unit * 0.16} ${x} ${y - unit * 0.336} Z`}
          className="fill-tone-soft stroke-tone"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

/**
 * Build a free-body diagram: choose which forces act on an object, then
 * check. Wrong choices get a reason; a right diagram shows the net force and
 * what the object does because of it.
 */
export function FreeBodyBuilder({
  situations: offered,
}: InteractiveProps<"free-body-builder">) {
  const t = useTranslations("interactives.freeBody");
  const [goalRef, reachGoal] = useGoal("free-body-builder");
  const [id, setId] = useState<SituationId>(offered[0]!);
  const [attempts, setAttempts] = useState<
    Partial<Record<SituationId, Attempt>>
  >({});

  const situation: Situation = situations[id];
  const { chosen, checked } = attempts[id] ?? blank;
  const solved = checked?.correct === true;
  const update = (next: Attempt) =>
    setAttempts((all) => ({ ...all, [id]: next }));

  const allSolved = offered.every((key) => attempts[key]?.checked?.correct);
  useEffect(() => {
    if (allSolved) reachGoal();
  }, [allSolved, reachGoal]);

  const toggle = (force: ForceId) =>
    update({
      chosen: chosen.includes(force)
        ? chosen.filter((other) => other !== force)
        : [...chosen, force],
      checked: null,
    });

  const net = netForce(situation);
  const balanced = magnitude(net) < 1e-9;
  /** Why a force does not belong: a reason for this situation if there is one. */
  const reason = (force: ForceId) => {
    const specific = `extra.${force}.${id}`;
    // Only some pairs have a reason of their own, so the key is built here
    // and cannot be checked against the message file by its type.
    return t(
      (t.has(specific as "extra.motion.default")
        ? specific
        : `extra.${force}.default`) as "extra.motion.default",
    );
  };

  return (
    <div ref={goalRef} data-subject="physics">
      {offered.length > 1 ? (
        <div className="overflow-x-auto border-b px-4 py-3 sm:px-5">
          <Segmented
            label={t("choose")}
            value={id}
            options={offered.map((key) => ({
              value: key,
              label: t(`situations.${key}.name`),
            }))}
            onChange={setId}
          />
        </div>
      ) : null}
      <p className="border-b px-4 py-3 text-sm font-medium sm:px-5">
        {t(`situations.${id}.description`)}
      </p>

      <Plot
        x={[-2.1, 2.1]}
        y={[-1, 1]}
        square
        shape="aspect-[4/3] sm:aspect-[3/2]"
        pad={{ left: 8, right: 8, top: 8, bottom: 8 }}
        xTicks={[]}
        yTicks={[]}
        axes={false}
        label={t("description", {
          forces:
            chosen.length > 0
              ? chosen.map((force) => t(`forces.${force}`)).join(", ")
              : t("none"),
        })}
        overlay={(view) => {
          const { scale } = view;
          const origin = { x: scale.toX(0), y: scale.toY(0) };
          const netTip =
            solved && !balanced
              ? {
                  x: origin.x + (scale.toX(net.x) - origin.x) * ARROW_SCALE,
                  y: origin.y + (scale.toY(net.y) - origin.y) * ARROW_SCALE,
                }
              : null;
          // Position among the chosen forces that point the same way.
          const beside = (force: ForceId) => {
            const same = chosen.filter(
              (other) =>
                situation.forces[other].angle === situation.forces[force].angle,
            );
            return same.indexOf(force) - (same.length - 1) / 2;
          };
          return (
            <>
              <Body situation={situation} view={view} />
              {chosen.map((force) => {
                const details = situation.forces[force];
                const v = forceVector(details);
                const radians = (details.angle * Math.PI) / 180;
                // Shift sideways, at right angles to the arrow.
                const shift = beside(force) * SIDE_STEP;
                const start = {
                  x: origin.x + Math.sin(radians) * shift,
                  y: origin.y + Math.cos(radians) * shift,
                };
                const tip = {
                  x: start.x + (scale.toX(v.x) - origin.x) * ARROW_SCALE,
                  y: start.y + (scale.toY(v.y) - origin.y) * ARROW_SCALE,
                };
                return (
                  <g key={force}>
                    <Arrow from={start} to={tip} className="text-tone" />
                    <text
                      x={tip.x + Math.cos(radians) * 10}
                      y={tip.y - Math.sin(radians) * 12 + 4}
                      textAnchor={
                        Math.cos(radians) > 0.3
                          ? "start"
                          : Math.cos(radians) < -0.3
                            ? "end"
                            : "middle"
                      }
                      className="fill-foreground text-[12px] font-semibold"
                    >
                      {t(`forces.${force}`)}
                    </text>
                  </g>
                );
              })}
              {netTip ? (
                // On top of the forces it is the sum of, and thicker than them.
                <g data-testid="free-body-net">
                  <Arrow
                    from={origin}
                    to={netTip}
                    className="text-accent"
                    width={8}
                  />
                  <text
                    // Beside the arrow: to its right if it is upright, else below.
                    x={netTip.x + (Math.abs(net.x) < Math.abs(net.y) ? 16 : 0)}
                    y={netTip.y + (Math.abs(net.x) < Math.abs(net.y) ? 4 : 24)}
                    textAnchor={
                      Math.abs(net.x) < Math.abs(net.y) ? "start" : "middle"
                    }
                    className="fill-foreground text-[12px] font-bold"
                  >
                    {t("net")}
                  </text>
                </g>
              ) : null}
            </>
          );
        }}
      />

      <div className="space-y-4 border-t p-4 sm:p-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("question")}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {forceIds.map((force) => {
              const on = chosen.includes(force);
              return (
                <label
                  key={force}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
                    on
                      ? "border-tone bg-tone-soft text-tone"
                      : "bg-background hover:border-tone/50",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() => toggle(force)}
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border-2",
                      on
                        ? "border-tone bg-tone text-background"
                        : "border-input",
                    )}
                  >
                    {on ? <Check className="size-3" strokeWidth={4} /> : null}
                  </span>
                  {t(`forces.${force}`)}
                </label>
              );
            })}
          </div>
        </fieldset>

        <Button
          onClick={() =>
            update({ chosen, checked: checkDiagram(situation, chosen) })
          }
          disabled={checked !== null}
        >
          {t("check")}
        </Button>

        <div aria-live="polite" data-testid="free-body-feedback">
          {solved ? (
            <div className="animate-rise-in rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
              <p className="flex items-center gap-2 font-semibold">
                <Check aria-hidden="true" className="size-4 shrink-0" />
                {t("right")}
              </p>
              <p className="mt-1 font-medium">
                {t(`situations.${id}.outcome`)}
              </p>
            </div>
          ) : checked ? (
            <ul className="animate-rise-in space-y-2 rounded-xl bg-danger-soft px-4 py-3 text-sm">
              {checked.extra.map((force) => (
                <li key={force} className="flex gap-2">
                  <CircleAlert
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-danger"
                  />
                  <span>
                    <strong className="font-semibold">
                      {t("notThere", { force: t(`forces.${force}`) })}
                    </strong>{" "}
                    {reason(force)}
                  </span>
                </li>
              ))}
              {checked.missing.length > 0 ? (
                <li className="flex gap-2">
                  <CircleAlert
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-danger"
                  />
                  <span>
                    <strong className="font-semibold">
                      {t("missing", { count: checked.missing.length })}
                    </strong>{" "}
                    {t(`hint.${checked.missing[0]!}`)}
                  </span>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
