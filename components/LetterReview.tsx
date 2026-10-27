"use client";

import { useId, useState, type ReactNode } from "react";
import { claimSegments } from "@/lib/claims";
import type { QualityCheck } from "@/lib/letter-quality";
import type { LetterClaim } from "@/types/coverLetter";

const backedMark =
  "rounded-sm bg-primary-50 dark:bg-primary-950 underline decoration-primary-500 decoration-1 underline-offset-4";
const unbackedMark =
  "rounded-sm bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 underline decoration-amber-500 decoration-wavy decoration-1 underline-offset-4";

const backedMarkActive = "bg-primary-100 dark:bg-primary-900";
const unbackedMarkActive = "bg-amber-100 dark:bg-amber-900";

const textClass = "text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed";

const evidenceLabel = "block font-medium not-italic text-gray-700 dark:text-gray-200 mb-0.5";
const evidenceBacked =
  "rounded-2xl bg-primary-50 dark:bg-primary-950 px-4 py-2.5 text-xs italic text-gray-600 dark:text-gray-300 leading-relaxed";
const evidenceUnbacked =
  "rounded-2xl bg-amber-50 dark:bg-amber-950 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200 leading-relaxed";

function withoutDark(classes: string): string {
  return classes
    .split(" ")
    .filter((c) => !c.startsWith("dark:"))
    .join(" ");
}

// The letter text, with each traced claim marked: green if backed by the user's material, amber if not.
// lightOnly is for pages that never switch to dark mode, like the landing page.
// With `explain`, each highlight can be tapped, clicked or focused to show its evidence in a panel
// below the letter (hover previews it), so the trace works on touch and keyboard, not just mouse.
// Without it, the claims list in <LetterReview> carries the evidence and highlights keep a tooltip.
export function HighlightedLetter({
  content,
  claims,
  lightOnly = false,
  explain = false,
  asideClassName = "mt-4",
  note,
}: {
  content: string;
  claims: LetterClaim[] | null;
  lightOnly?: boolean;
  explain?: boolean;
  // Wraps the evidence panel and `note`; lets a caller place them beside the letter instead of below.
  asideClassName?: string;
  note?: ReactNode;
}) {
  const panelId = useId();
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const cls = (c: string) => (lightOnly ? withoutDark(c) : c);
  if (!claims || claims.length === 0) return <p className={cls(textClass)}>{content}</p>;

  const segments = claimSegments(content, claims);
  const shown = hovered ?? selected;
  const shownClaim = shown === null ? null : segments[shown]?.claim;

  function choose(i: number) {
    setSelected((s) => (s === i ? null : i));
  }

  return (
    <>
      <p className={cls(textClass)}>
        {segments.map((seg, i) => {
          if (!seg.claim) return <span key={i}>{seg.text}</span>;
          const markClass = cls(seg.claim.source ? backedMark : unbackedMark);
          if (!explain) {
            return (
              <mark
                key={i}
                className={markClass}
                title={seg.claim.source ? `From ${seg.claim.source}: "${seg.claim.evidence}"` : "Not found in your material"}
              >
                {seg.text}
              </mark>
            );
          }
          return (
            <mark
              key={i}
              role="button"
              tabIndex={0}
              aria-pressed={selected === i}
              aria-controls={panelId}
              onClick={() => choose(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  choose(i);
                }
              }}
              // Mouse only: a tap fires an enter with no matching leave, which would pin the preview.
              onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(i)}
              onPointerLeave={() => setHovered(null)}
              className={`${markClass} cursor-pointer transition-colors ${
                selected === i ? cls(seg.claim.source ? backedMarkActive : unbackedMarkActive) : ""
              }`}
            >
              {seg.text}
            </mark>
          );
        })}
      </p>
      {explain && (
        <div className={asideClassName}>
          <div id={panelId} aria-live="polite" className="min-h-[3.5rem]">
            {shownClaim ? (
              shownClaim.source ? (
                <p className={cls(evidenceBacked)}>
                  <span className={cls(evidenceLabel)}>From {shownClaim.source}</span>
                  &ldquo;{shownClaim.evidence}&rdquo;
                </p>
              ) : (
                <p className={cls(evidenceUnbacked)}>
                  <span className={cls(evidenceLabel)}>Not found in the source material</span>
                  Nothing they wrote backs this line, so it&apos;s flagged to check before sending.
                </p>
              )
            ) : (
              <p className={cls("flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400 py-2")}>
                <i className="ti ti-pointer text-sm leading-4 shrink-0" aria-hidden="true" />
                Tap or hover a highlight to see the exact line it came from.
              </p>
            )}
          </div>
          {note}
        </div>
      )}
    </>
  );
}

interface LetterReviewProps {
  claims: LetterClaim[] | null;
  checks: QualityCheck[];
  checking: boolean;
  checkError: string;
  onCheckSources: () => void;
}

// Quality checks plus the list of claims and where each one came from.
export default function LetterReview({ claims, checks, checking, checkError, onCheckSources }: LetterReviewProps) {
  const [showClaims, setShowClaims] = useState(true);
  const unbacked = claims?.filter((c) => !c.source).length ?? 0;

  return (
    <div className="px-4 py-3 border-t border-gray-50 dark:border-gray-800 space-y-4">
      <div>
        <p className="section-label mb-2">
          Before you send
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-xs">
              <i
                className={`ti ${c.ok ? "ti-circle-check text-primary-500" : "ti-alert-triangle text-amber-500"} text-sm mt-px`}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="text-gray-700 dark:text-gray-300">{c.label}</span>
                <span className="block text-gray-500 dark:text-gray-400">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="section-label">
            Where each claim came from
          </p>
          <div className="flex items-center gap-3">
            {claims && claims.length > 0 && (
              <button
                onClick={() => setShowClaims((v) => !v)}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600 transition-colors"
              >
                {showClaims ? "Hide" : `Show ${claims.length}`}
              </button>
            )}
            <button
              onClick={onCheckSources}
              disabled={checking}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600 transition-colors disabled:opacity-50"
            >
              <i className={`ti ${checking ? "ti-loader-2 animate-spin" : "ti-refresh"} text-xs`} aria-hidden="true" />
              {checking ? "Checking…" : claims ? "Re-check" : "Check sources"}
            </button>
          </div>
        </div>

        {checkError && <p className="text-xs text-amber-600 mb-2">{checkError}</p>}

        {!claims ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Not checked yet. Run a check to trace every claim back to your resume and background.
          </p>
        ) : claims.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">This letter makes no specific claims about you.</p>
        ) : (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {unbacked === 0
                ? `All ${claims.length} claims trace back to your own material.`
                : `${unbacked} of ${claims.length} claims aren't in your resume or background. Make sure they're true, or cut them.`}
            </p>
            {showClaims && (
              <ul className="mt-3 space-y-2.5">
                {claims.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <i
                      className={`ti ${c.source ? "ti-link text-primary-500" : "ti-help-circle text-amber-500"} text-sm mt-px`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-gray-700 dark:text-gray-300">&ldquo;{c.quote}&rdquo;</p>
                      {c.source ? (
                        <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                          {c.source}
                          <span className="block italic">&ldquo;{c.evidence}&rdquo;</span>
                        </p>
                      ) : (
                        <p className="text-amber-600 dark:text-amber-500 mt-0.5">Not found in your material</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
