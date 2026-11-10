// Golden hour illustrations (DESIGN.md §9): a flat sun scene for heroes, and small line drawings in ink with one flat sun for empty states. Strokes use
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

// Golden hour's scene: a flat sun over two rounded hills, in the hero's own colors. `sun` is how far
// it has risen: "low" when you're just starting, "up" when there's nothing left to do today. In night
// mode the sun turns into a crescent moon (a hero-colored disc bites into it) and a few stars come out.
// Sized by its parent: it fills it, anchored bottom right.
export function Horizon({ sun = "low", className = "" }: { sun?: "low" | "up"; className?: string }) {
  const cy = sun === "up" ? 96 : 118;
  return (
    <svg
      viewBox="0 0 320 200"
      preserveAspectRatio="xMaxYMax slice"
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="214" cy={cy} r="44" fill="var(--sun)" />
      <circle cx="236" cy={cy - 16} r="38" fill="var(--hero)" className="hidden dark:inline" />
      <g fill="var(--sun)" className="hidden dark:inline">
        <circle cx="96" cy="40" r="2.5" />
        <circle cx="140" cy="86" r="2" />
        <circle cx="296" cy="112" r="2.5" />
        <circle cx="62" cy="96" r="2" />
      </g>
      <ellipse cx="300" cy="236" rx="200" ry="104" fill="var(--hill-near)" />
      <ellipse cx="120" cy="250" rx="180" ry="100" fill="var(--hill-far)" />
    </svg>
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
