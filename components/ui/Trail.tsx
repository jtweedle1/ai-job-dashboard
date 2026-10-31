"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// The trail (DESIGN.md §8): Wayfinder's connective line. Finished stretches are solid ink, what's
// ahead is dashed, and the sun sits on where you are. A stretch that becomes finished while you watch
// draws itself in.

export type TrailState = "done" | "current" | "upcoming";

export interface TrailStop {
  id: string;
  label: React.ReactNode;
  state: TrailState;
  // A second line under the label, like a count or company names.
  detail?: React.ReactNode;
  // Makes the stop a button.
  onSelect?: () => void;
  // Makes the stop a link.
  href?: string;
  // Overrides the stop's accessible name (useful when label and detail read badly together).
  ariaLabel?: string;
  // Screen-reader-only text after the label, like "(done)".
  srHint?: string;
}

export function TrailNode({ state }: { state: TrailState }) {
  if (state === "current") return <span className="w-4 h-4 rounded-full bg-sun ring-4 ring-sun-wash" aria-hidden="true" />;
  if (state === "done")
    return (
      <span className="w-3 h-3 rounded-full bg-ink-soft text-canvas inline-flex items-center justify-center" aria-hidden="true">
        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5">
          <path d="M3 6.2 5.1 8.2 9 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  return <span className="w-3 h-3 rounded-full border-[1.5px] border-control bg-canvas" aria-hidden="true" />;
}

// A horizontal stretch of trail. Solid when walked; dashed when still ahead.
function Segment({ walked }: { walked: boolean }) {
  const was = useRef(walked);
  const [drawing, setDrawing] = useState(false);
  useEffect(() => {
    if (walked && !was.current) setDrawing(true);
    was.current = walked;
  }, [walked]);

  return (
    <svg className="absolute left-1/2 w-full top-[7px] h-0.5 overflow-visible" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 2">
      <line x1="10" y1="1" x2="90" y2="1" vectorEffect="non-scaling-stroke" strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" className="stroke-rule" />
      {walked && (
        <line
          x1="10"
          y1="1"
          x2="90"
          y2="1"
          vectorEffect="non-scaling-stroke"
          strokeWidth="2"
          strokeLinecap="round"
          pathLength={1}
          className={`stroke-ink-soft ${drawing ? "draw-in" : ""}`}
        />
      )}
    </svg>
  );
}

export default function Trail({
  stops,
  label,
  size = "md",
}: {
  stops: TrailStop[];
  // Accessible name for the whole trail.
  label: string;
  size?: "sm" | "md";
}) {
  const interactive = stops.some((s) => s.onSelect || s.href);
  const List = (
    <ol className="flex items-start">
      {stops.map((s, i) => {
        const nextWalked = i < stops.length - 1 && s.state === "done";
        const body = (
          <>
            <span className="h-4 flex items-center justify-center">
              <TrailNode state={s.state} />
            </span>
            <span
              className={`mt-2 font-semibold leading-tight transition-colors duration-100 ${size === "sm" ? "text-meta" : "text-meta sm:text-control"} ${
                s.state === "current" ? "text-ink" : "text-ink-soft group-hover:text-ink"
              }`}
            >
              {s.label}
              {s.srHint && <span className="sr-only"> {s.srHint}</span>}
            </span>
            {s.detail && <span className="mt-0.5 text-meta text-ink-muted leading-snug">{s.detail}</span>}
          </>
        );
        return (
          <li key={s.id} className="relative flex-1 min-w-0">
            {i < stops.length - 1 && <Segment walked={nextWalked} />}
            {s.href ? (
              <Link
                href={s.href}
                aria-label={s.ariaLabel}
                aria-current={s.state === "current" ? "step" : undefined}
                className="relative w-full flex flex-col items-center text-center px-1 pb-1 rounded-stamp group"
              >
                {body}
              </Link>
            ) : s.onSelect ? (
              <button
                type="button"
                onClick={s.onSelect}
                aria-current={s.state === "current" ? "step" : undefined}
                aria-label={s.ariaLabel}
                className="relative w-full flex flex-col items-center text-center px-1 pb-1 rounded-stamp group"
              >
                {body}
              </button>
            ) : (
              <div className="relative flex flex-col items-center text-center px-1" aria-current={s.state === "current" ? "step" : undefined}>
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
  return interactive ? <nav aria-label={label}>{List}</nav> : <div role="group" aria-label={label}>{List}</div>;
}
