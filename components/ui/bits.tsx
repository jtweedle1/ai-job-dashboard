// Small Trailhead pieces used across screens (DESIGN.md §8). Each one replaces a class string that
// used to be repeated by hand.

import { STAGE_META, type JobStage, type StageTone } from "@/types/job";

// The one raised surface on a screen. A sheet inside a sheet is a bug.
export function Sheet({
  as: Tag = "div",
  className = "",
  children,
  ...rest
}: { as?: "div" | "section" | "article"; className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`bg-sheet rounded-sheet shadow-sheet p-5 sm:p-8 ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

// A section on the page: a label (or serif heading) and its content. Not a box.
export function Section({
  title,
  serif = false,
  action,
  id,
  className = "",
  children,
}: {
  title?: React.ReactNode;
  // Serif headings for sections on reading pages; sans labels everywhere else.
  serif?: boolean;
  action?: React.ReactNode;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section aria-labelledby={headingId} className={className}>
      {title && (
        <div className="flex items-center gap-3 mb-3 min-h-9">
          <h2
            id={headingId}
            className={`flex-1 min-w-0 ${serif ? "font-serif text-heading font-semibold text-ink" : "text-label font-semibold text-ink-soft"}`}
          >
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const DOT: Record<StageTone, string> = {
  stone: "bg-stone",
  sky: "bg-sky",
  sun: "bg-sun",
  moss: "bg-moss",
};

export function StageDot({ stage, size = 8 }: { stage: JobStage; size?: 8 | 12 }) {
  const meta = STAGE_META[stage];
  const px = size === 8 ? "w-2 h-2" : "w-3 h-3";
  return meta.hollow ? (
    <span className={`${px} shrink-0 rounded-full border-[1.5px] border-stone`} aria-hidden="true" />
  ) : (
    <span className={`${px} shrink-0 rounded-full ${DOT[meta.tone]}`} aria-hidden="true" />
  );
}

// A dot plus the stage name. Color is never the only signal.
export function StageIndicator({ stage, className = "" }: { stage: JobStage; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-meta text-ink-soft whitespace-nowrap ${className}`}>
      <StageDot stage={stage} />
      {STAGE_META[stage].label}
    </span>
  );
}

// A company's initial, stamped. Replaces the generic building icon.
export function Monogram({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  const box = size === "sm" ? "w-8 h-8 text-sm" : size === "lg" ? "w-12 h-12 text-xl" : "w-9 h-9 text-base";
  return (
    <span
      className={`${box} shrink-0 rounded-stamp bg-well text-ink font-serif font-semibold inline-flex items-center justify-center`}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}

const MESSAGE_TONE = {
  caution: { box: "bg-caution-wash", icon: "ti-alert-triangle text-caution" },
  danger: { box: "bg-danger-wash", icon: "ti-alert-circle text-danger" },
  info: { box: "bg-sky-wash", icon: "ti-info-circle text-sky" },
} as const;

// For "check this" and "something went wrong". Success is shown by the thing changing, not a green box.
export function InlineMessage({
  tone = "caution",
  children,
  action,
  role,
  className = "",
}: {
  tone?: keyof typeof MESSAGE_TONE;
  children: React.ReactNode;
  action?: React.ReactNode;
  role?: "alert" | "status";
  className?: string;
}) {
  const t = MESSAGE_TONE[tone];
  return (
    <div role={role} className={`flex items-start gap-3 flex-wrap px-4 py-3 rounded-field ${t.box} text-ink ${className}`}>
      <i className={`ti ${t.icon} text-base mt-0.5 shrink-0`} aria-hidden="true" />
      <div className="flex-1 min-w-[12rem]">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// One illustration, one sentence, one action. Never inside a sheet.
export function EmptyState({
  art,
  title,
  children,
  action,
  className = "",
}: {
  art?: React.ReactNode;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center text-center py-12 px-4 ${className}`}>
      {art && <div className="mb-5 text-ink">{art}</div>}
      {title && <p className="font-serif text-heading font-semibold text-ink mb-1.5">{title}</p>}
      {children && <div className="text-ink-soft max-w-sm">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// A static placeholder in the shape of what's loading. No shimmer.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-well rounded-stamp ${className}`} aria-hidden="true" />;
}

// The page-level loading state: a few static blocks inside the frame, announced once.
export function LoadingBlocks({ rows = 3, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div aria-busy="true" role="status" className="space-y-3">
      <span className="sr-only">{label}…</span>
      <Skeleton className="h-8 w-56 rounded-field" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="pt-6 space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-field" />
        ))}
      </div>
    </div>
  );
}

// 18px checkbox with the action color when checked.
export function Checkbox(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      {...props}
      className={`w-[18px] h-[18px] shrink-0 rounded-[5px] border border-control accent-[var(--action)] cursor-pointer ${props.className ?? ""}`}
    />
  );
}
