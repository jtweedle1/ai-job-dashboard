"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { HighlightedLetter } from "@/components/LetterReview";
import {
  BANNED_PHRASES,
  GENERIC_EXCERPT,
  GENERIC_FLAGS,
  GENERIC_OPENINGS,
  SHOWCASE_JOB,
  VOICE_CLAIMS,
  VOICE_EXCERPT,
  VOICE_FLAGS,
  VOICE_OPENINGS,
  splitOnPhrases,
} from "@/lib/landing-showcase";

type Side = "generic" | "voice";

const TABS: { id: Side; label: string }[] = [
  { id: "generic", label: "Generic AI" },
  { id: "voice", label: "Wayfinder" },
];

const bannedCount = GENERIC_FLAGS.filter((f) => BANNED_PHRASES.includes(f)).length;
const clicheCount = GENERIC_FLAGS.length - bannedCount;

// The hero's proof: the same opening for the same job, written by a generic AI tool and by Wayfinder
// in Riley's voice. Both sides are stacked in one grid cell so flipping never changes the sheet's height.
export default function LetterCompare() {
  const [side, setSide] = useState<Side>("generic");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = side === "generic" ? 1 : 0;
    setSide(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  const panel = (id: Side) =>
    `[grid-area:1/1] flex flex-col transition-opacity duration-200 motion-reduce:transition-none ${
      side === id ? "opacity-100" : "opacity-0 invisible"
    }`;

  return (
    <div className="bg-sheet rounded-sheet shadow-sheet text-left">
      <div className="px-5 sm:px-8 pt-6 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-heading font-semibold text-ink">Same job, two letters</h2>
          <p className="text-meta text-ink-soft">
            {SHOWCASE_JOB.title} at {SHOWCASE_JOB.company}
          </p>
        </div>
        <div role="tablist" aria-label="Who wrote it" className="flex p-1 rounded-full bg-well" onKeyDown={onKeyDown}>
          {TABS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`compare-tab-${t.id}`}
              aria-selected={side === t.id}
              aria-controls={`compare-panel-${t.id}`}
              tabIndex={side === t.id ? 0 : -1}
              onClick={() => setSide(t.id)}
              className={`h-9 px-4 rounded-full text-meta font-semibold transition-colors duration-100 ${
                side === t.id ? "bg-sheet text-ink shadow-sheet" : "text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid">
        <div id="compare-panel-generic" role="tabpanel" aria-labelledby="compare-tab-generic" className={panel("generic")}>
          <div className="px-5 sm:px-8 py-4">
            <p className="text-ui leading-relaxed text-ink whitespace-pre-wrap">
              {splitOnPhrases(GENERIC_EXCERPT, GENERIC_FLAGS).map((part, i) =>
                part.hit ? (
                  <mark
                    key={i}
                    className="rounded-sm bg-caution-wash text-ink underline decoration-caution decoration-wavy decoration-1 underline-offset-4"
                  >
                    {part.text}
                  </mark>
                ) : (
                  <span key={i}>{part.text}</span>
                )
              )}
            </p>
            <p className="text-meta text-ink-muted mt-3">An example of what a generic AI tool writes, for comparison.</p>
          </div>
          <ul className="mt-auto mx-5 sm:mx-8 py-4 border-t border-rule flex flex-wrap gap-x-5 gap-y-1.5 text-meta text-ink">
            <Fact icon="ti-alert-triangle text-caution">{`${clicheCount} AI clichés`}</Fact>
            <Fact icon="ti-ban text-caution">{`${bannedCount} of Riley’s banned words`}</Fact>
            <Fact icon="ti-repeat text-caution">{GENERIC_OPENINGS.detail}</Fact>
          </ul>
        </div>

        <div id="compare-panel-voice" role="tabpanel" aria-labelledby="compare-tab-voice" className={panel("voice")}>
          <div className="px-5 sm:px-8 py-4">
            <HighlightedLetter content={VOICE_EXCERPT} claims={VOICE_CLAIMS} compact />
            <p className="text-meta text-ink-muted mt-3">From Riley&apos;s demo letter. Hover an underline to see the note it came from.</p>
          </div>
          <ul className="mt-auto mx-5 sm:mx-8 py-4 border-t border-rule flex flex-wrap gap-x-5 gap-y-1.5 text-meta text-ink">
            <Fact icon="ti-circle-check text-moss">
              {VOICE_FLAGS.length === 0 ? "No clichés or banned words" : `${VOICE_FLAGS.length} flagged phrases`}
            </Fact>
            <Fact icon="ti-circle-check text-moss">{`${VOICE_CLAIMS.length} claims traced to Riley’s notes`}</Fact>
            <Fact icon="ti-circle-check text-moss">{VOICE_OPENINGS.detail}</Fact>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Fact({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <i className={`ti ${icon} text-base`} aria-hidden="true" />
      {children}
    </li>
  );
}
