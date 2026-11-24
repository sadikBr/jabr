"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
} from "@xyflow/react";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { MasteryIcon } from "@/components/progress/mastery-icon";
import {
  type GraphLayout,
  NODE_HEIGHT,
  NODE_WIDTH,
} from "@/lib/content/graph-layout";
import { masteryStatus } from "@/lib/mastery/mastery";
import { useProgress } from "@/lib/progress/use-progress";
import { cn } from "@/lib/utils";

interface MapState {
  /** Concepts to show at full strength; null means all of them. */
  highlighted: ReadonlySet<string> | null;
  /** Concepts the learner is ready to pick up next. */
  ready: ReadonlySet<string>;
  /** The concept under the pointer or keyboard focus. */
  active: string | null;
  setActive: (id: string | null) => void;
}

const MapContext = createContext<MapState>({
  highlighted: null,
  ready: new Set(),
  active: null,
  setActive: () => {},
});

type ConceptNode = Node<{ title: string; subject: string }, "concept">;

/** One concept on the map: a link to its page, with the learner's mastery. */
function ConceptNodeView({ id, data }: NodeProps<ConceptNode>) {
  const t = useTranslations();
  const { highlighted, ready, setActive } = useContext(MapContext);
  const status = masteryStatus(useProgress().mastery[id]?.score);
  const dimmed = highlighted !== null && !highlighted.has(id);
  const isReady = ready.has(id);

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        className="opacity-0"
      />
      <Link
        href={`/concepts/${id}`}
        data-mastery={status}
        data-concept={id}
        onMouseEnter={() => setActive(id)}
        onMouseLeave={() => setActive(null)}
        onFocus={() => setActive(id)}
        onBlur={() => setActive(null)}
        // React Flow switches pointer events off for nodes that cannot be
        // dragged or selected; the link turns them back on for itself.
        style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
        className={cn(
          "pointer-events-auto relative flex items-center gap-2.5 rounded-xl border-2 bg-card px-3 text-start text-sm leading-tight font-semibold shadow-sm transition-[opacity,border-color,box-shadow] hover:shadow-md",
          status === "new" ? "border-border" : "border-tone",
          status === "mastered" && "bg-tone-soft",
          dimmed && "opacity-25",
        )}
      >
        {/* The subject, as a coloured stripe down the leading edge. */}
        <span
          aria-hidden="true"
          data-subject={data.subject}
          className="absolute inset-y-2 start-1 w-1 rounded-full bg-tone"
        />
        <MasteryIcon status={status} className="ms-1.5 size-5" />
        <span className="line-clamp-2 min-w-0 flex-1">{data.title}</span>
        <span className="sr-only">
          ({t(`mastery.status.${status}`)}
          {isReady ? `, ${t("map.ready")}` : ""})
        </span>
        {isReady && !dimmed ? (
          <span
            aria-hidden="true"
            title={t("map.ready")}
            className="absolute -end-2 -top-2 flex size-6 items-center justify-center rounded-full bg-accent text-accent-foreground shadow"
          >
            <Sparkles className="size-3.5" />
          </span>
        ) : null}
      </Link>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="opacity-0"
      />
    </>
  );
}

const nodeTypes = { concept: ConceptNodeView };

/** Below this zoom the node labels are too small to read. */
const MIN_READABLE_ZOOM = 0.6;
/** Space left around the graph when fitting it, as a share of the view. */
const PADDING = 0.06;

/**
 * The knowledge map: every concept, with arrows from each prerequisite to
 * what it leads to. Positions come from the server (lib/content/graph-layout),
 * so nothing jumps on load. React Flow follows `data-theme` on <html> for
 * dark mode by itself. Pan and zoom with mouse, touch or the controls;
 * each node is a real link, so the keyboard walks through them in order.
 */
export default function ConceptMap({
  layout,
  highlighted,
  ready,
  start,
}: {
  layout: GraphLayout;
  highlighted: ReadonlySet<string> | null;
  ready: ReadonlySet<string>;
  /** What to show first when the whole map would be too small to read. */
  start: string[];
}) {
  const t = useTranslations("map");
  const [active, setActive] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  // The size of the map area, measured once when it first appears. It decides
  // whether the whole graph can be shown at a readable size.
  const [box, setBox] = useState<{ width: number; height: number } | null>(
    null,
  );
  const fitsWhole =
    box !== null &&
    Math.min(box.width / layout.width, box.height / layout.height) *
      (1 - 2 * PADDING) >=
      MIN_READABLE_ZOOM;

  // …/map#derivative-definition opens centred on that concept.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the hash only exists in the browser
    if (layout.nodes.some((node) => node.id === id)) setFocus(id);
  }, [layout.nodes]);

  const nodes = useMemo<ConceptNode[]>(
    () =>
      layout.nodes.map((node) => ({
        id: node.id,
        type: "concept",
        position: { x: node.x, y: node.y },
        data: { title: node.title, subject: node.subject },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        draggable: false,
        selectable: false,
        focusable: false, // the link inside is the tab stop
      })),
    [layout.nodes],
  );

  const edges = useMemo<Edge[]>(
    () =>
      layout.edges.map(({ source, target }) => {
        const touchesActive = active === source || active === target;
        const faded =
          (active !== null && !touchesActive) ||
          (highlighted !== null &&
            !(highlighted.has(source) && highlighted.has(target)));
        const color = touchesActive
          ? "var(--primary)"
          : "var(--muted-foreground)";
        return {
          id: `${source}->${target}`,
          source,
          target,
          focusable: false,
          selectable: false,
          style: {
            stroke: color,
            strokeWidth: touchesActive ? 2.5 : 1.5,
            opacity: faded ? 0.15 : touchesActive ? 1 : 0.55,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color,
            width: 16,
            height: 16,
          },
        };
      }),
    [layout.edges, active, highlighted],
  );

  const state = useMemo(
    () => ({ highlighted, ready, active, setActive }),
    [highlighted, ready, active],
  );

  return (
    <MapContext.Provider value={state}>
      <div
        ref={(element) => {
          if (element && box === null) {
            setBox({
              width: element.clientWidth,
              height: element.clientHeight,
            });
          }
        }}
        className="size-full"
      >
        {box === null ? null : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={
              focus
                ? { nodes: [{ id: focus }], maxZoom: 1.1, padding: 2.5 }
                : {
                    // Everything when it fits at a readable size; otherwise the
                    // neighbourhood named by `start`, and the learner pans.
                    nodes: (fitsWhole
                      ? layout.nodes.map((n) => n.id)
                      : start
                    ).map((id) => ({ id })),
                    padding: PADDING,
                    minZoom: MIN_READABLE_ZOOM,
                    maxZoom: 1,
                  }
            }
            key={focus ?? "all"}
            minZoom={0.2}
            maxZoom={1.6}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable={false}
            edgesFocusable={false}
            elementsSelectable={false}
            aria-label={t("canvasLabel")}
          >
            <Background gap={24} color="var(--border)" />
            <Controls showInteractive={false} position="bottom-right" />
          </ReactFlow>
        )}
      </div>
    </MapContext.Provider>
  );
}
