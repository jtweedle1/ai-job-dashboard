// Trailhead illustrations (DESIGN.md §9): line drawings in ink with one flat sun. Strokes use
// currentColor and the sun uses the sun token, so both themes work. Decorative: hidden from screen
// readers, because the sentence next to each one carries the meaning. At most one per screen.

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke" as const,
};

const DASH = { ...STROKE, strokeDasharray: "3 6" };

function Art({ width, viewBox, className = "", children }: { width: number; viewBox: string; className?: string; children: React.ReactNode }) {
  return (
    <svg viewBox={viewBox} width={width} className={`h-auto max-w-full ${className}`} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

// Hills with the sun coming up behind them and a trail running in. `height` is how far the sun has
// risen: "low" when you're just starting, "up" when there's nothing left to do today. The hills are
// filled with the surface behind them (pass `ground`) so the sun sits behind the ridge.
export function Horizon({
  width = 160,
  sun = "low",
  ground = "var(--canvas)",
  className,
}: {
  width?: number;
  sun?: "low" | "up";
  ground?: string;
  className?: string;
}) {
  const cy = sun === "up" ? 30 : 52;
  return (
    <Art width={width} viewBox="0 0 160 100" className={className}>
      <circle cx="104" cy={cy} r="17" fill="var(--sun)" />
      <path d="M6 72 C 30 54, 58 50, 84 62 S 132 76, 154 60 L154 100 L6 100 Z" fill={ground} />
      <path d="M6 72 C 30 54, 58 50, 84 62 S 132 76, 154 60" {...STROKE} />
      <path d="M2 88 C 32 78, 64 78, 94 86 S 138 94, 158 84" {...STROKE} />
      <path d="M58 99 C 64 92, 80 90, 86 82 S 92 72, 100 68" {...DASH} />
    </Art>
  );
}

// A signpost at the start of a trail: for an empty Pipeline.
export function Signpost({ width = 140, className }: { width?: number; className?: string }) {
  return (
    <Art width={width} viewBox="0 0 140 110" className={className}>
      <circle cx="104" cy="26" r="12" fill="var(--sun)" />
      <path d="M58 30 L58 96" {...STROKE} />
      <path d="M58 36 L92 36 L100 44 L92 52 L58 52 Z" {...STROKE} />
      <path d="M58 60 L30 60 L22 68 L30 76 L58 76" {...STROKE} />
      <path d="M8 98 C 40 92, 92 92, 132 98" {...STROKE} />
      <path d="M76 104 C 88 100, 104 98, 120 92" {...DASH} />
    </Art>
  );
}

// Contour lines with a sun dot for "you are here": for an empty Library.
export function ContourMap({ width = 140, className }: { width?: number; className?: string }) {
  return (
    <Art width={width} viewBox="0 0 140 100" className={className}>
      <path d="M22 52 C 18 30, 46 14, 72 16 S 124 30, 120 54 S 92 88, 64 86 S 26 74, 22 52 Z" {...STROKE} />
      <path d="M38 52 C 36 38, 54 28, 72 30 S 106 40, 104 54 S 86 74, 66 72 S 40 64, 38 52 Z" {...STROKE} />
      <path d="M54 52 C 54 44, 64 40, 74 42 S 90 48, 88 56 S 78 64, 68 62 S 54 58, 54 52 Z" {...STROKE} />
      <circle cx="71" cy="52" r="5" fill="var(--sun)" />
    </Art>
  );
}

// An open notebook with the week drawn as a short trail: for the weekly review.
export function Notebook({ width = 140, className }: { width?: number; className?: string }) {
  return (
    <Art width={width} viewBox="0 0 140 100" className={className}>
      <path d="M70 22 C 56 14, 30 14, 14 20 L14 84 C 30 78, 56 78, 70 86 C 84 78, 110 78, 126 84 L126 20 C 110 14, 84 14, 70 22 Z" {...STROKE} />
      <path d="M70 22 L70 86" {...STROKE} />
      <path d="M26 62 C 34 54, 42 60, 50 50 S 58 40, 62 42" {...DASH} />
      <circle cx="62" cy="40" r="4.5" fill="var(--sun)" />
      <path d="M82 36 L114 34 M82 48 L110 46 M82 60 L106 58" {...STROKE} />
    </Art>
  );
}
