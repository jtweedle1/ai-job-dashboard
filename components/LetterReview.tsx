"use client";

import { useState } from "react";
import { claimSegments } from "@/lib/claims";
import type { QualityCheck } from "@/lib/letter-quality";
import type { LetterClaim } from "@/types/coverLetter";

// Backed claims get a quiet sky underline; unbacked ones a caution wash and a wavy line, so the
// difference never rests on color alone.
const MARKS = {
  backed: "rounded-sm bg-transparent text-inherit underline decoration-sky decoration-1 underline-offset-4",
  unbacked: "rounded-sm bg-caution-wash text-ink underline decoration-caution decoration-wavy decoration-1 underline-offset-4",
  text: "text-reading text-ink whitespace-pre-wrap",
};
// The letter text, with each traced claim marked: underlined if backed by the user's material,
// highlighted with a wavy line if not. `compact` sets it at UI size, for excerpts on the landing page.
export function HighlightedLetter({
  content,
  claims,
  compact = false,
}: {
  content: string;
  claims: LetterClaim[] | null;
  compact?: boolean;
}) {
  const m = compact ? { ...MARKS, text: "text-ui leading-relaxed text-ink whitespace-pre-wrap" } : MARKS;
  if (!claims || claims.length === 0) return <p className={m.text}>{content}</p>;
  return (
    <p className={m.text}>
      {claimSegments(content, claims).map((seg, i) =>
        seg.claim ? (
          <mark
            key={i}
            className={seg.claim.source ? m.backed : m.unbacked}
            title={seg.claim.source ? `From ${seg.claim.source}: "${seg.claim.evidence}"` : "Not found in your material"}
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
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
    <div className="space-y-10">
      <section aria-labelledby="checks-heading">
        <h3 id="checks-heading" className="mb-3 font-serif text-heading font-semibold text-ink">
          Before you send
        </h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2.5">
              <i className={`ti ${c.ok ? "ti-check text-moss" : "ti-alert-triangle text-caution"} text-base mt-0.5`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-semibold text-ink">
                  {c.label}
                  <span className="sr-only">{c.ok ? " (looks good)" : " (check this)"}</span>
                </span>
                <span className="block text-meta text-ink-soft">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="claims-heading">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h3 id="claims-heading" className="font-serif text-heading font-semibold text-ink">
            Where each claim came from
          </h3>
          <div className="flex items-center gap-1">
            {claims && claims.length > 0 && (
              <button
                onClick={() => setShowClaims((v) => !v)}
                aria-expanded={showClaims}
                className="h-8 px-3 rounded-full text-meta font-semibold text-action hover:bg-well transition-colors duration-100"
              >
                {showClaims ? "Hide" : `Show ${claims.length}`}
              </button>
            )}
            <button
              onClick={onCheckSources}
              disabled={checking}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-meta font-semibold text-action hover:bg-well transition-colors duration-100 disabled:opacity-45"
            >
              <i className={`ti ${checking ? "ti-loader-2 animate-spin" : "ti-refresh"}`} aria-hidden="true" />
              {checking ? "Checking…" : claims ? "Check again" : "Check sources"}
            </button>
          </div>
        </div>

        {checkError && (
          <p role="alert" className="mb-3 px-4 py-3 rounded-field bg-caution-wash text-ink">
            {checkError}
          </p>
        )}

        {!claims ? (
          <p className="text-ink-soft">Not checked yet. Run a check to trace every claim back to your resume and background.</p>
        ) : claims.length === 0 ? (
          <p className="text-ink-soft">This letter makes no specific claims about you.</p>
        ) : (
          <>
            <p className="text-ink-soft">
              {unbacked === 0
                ? `All ${claims.length} claims trace back to your own material.`
                : `${unbacked} of ${claims.length} claims aren't in your resume or background. Make sure they're true, or cut them.`}
            </p>
            {showClaims && (
              <ul className="mt-4">
                {claims.map((c, i) => (
                  <li key={i} className="py-3 border-b border-rule last:border-b-0">
                    <p className="font-serif italic text-ink">&ldquo;{c.quote}&rdquo;</p>
                    {c.source ? (
                      <p className="mt-1 text-meta text-ink-soft">
                        <span className="font-semibold text-sky">From {c.source}:</span> &ldquo;{c.evidence}&rdquo;
                      </p>
                    ) : (
                      <p className="mt-1 text-meta font-semibold text-caution">
                        <i className="ti ti-alert-triangle mr-1" aria-hidden="true" />
                        Not found in your material
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
