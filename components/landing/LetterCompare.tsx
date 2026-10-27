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

const TABS: { id: Side; label: string; icon: string }[] = [
  { id: "generic", label: "Generic AI", icon: "ti-robot" },
  { id: "voice", label: "Wayfinder", icon: "ti-feather" },
];

const bannedCount = GENERIC_FLAGS.filter((f) => BANNED_PHRASES.includes(f)).length;
const clicheCount = GENERIC_FLAGS.length - bannedCount;

// The hero's proof: the same opening for the same job, written by a generic AI tool and by Wayfinder
// in Riley's voice. Both sides are stacked in one grid cell so flipping never changes the card's height.
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
    `[grid-area:1/1] flex flex-col transition-opacity duration-300 motion-reduce:transition-none ${
      side === id ? "opacity-100" : "opacity-0 invisible"
    }`;

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl shadow-xl shadow-primary-900/10 text-left overflow-hidden">
      <div className="px-5 sm:px-6 pt-5 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
        <div>
          <h2 className="font-display font-bold text-gray-900">Same job, two letters</h2>
          <p className="text-xs text-gray-500">
            {SHOWCASE_JOB.title} · {SHOWCASE_JOB.company}
          </p>
        </div>
        <div role="tablist" aria-label="Who wrote it" className="flex p-1 rounded-full bg-gray-100" onKeyDown={onKeyDown}>
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
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full transition-colors ${
                side === t.id ? "bg-white text-gray-900 shadow-sm shadow-gray-900/10" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <i className={`ti ${t.icon} text-sm`} aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid">
        <div id="compare-panel-generic" role="tabpanel" aria-labelledby="compare-tab-generic" className={panel("generic")}>
          <div className="px-5 sm:px-6 py-5">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {splitOnPhrases(GENERIC_EXCERPT, GENERIC_FLAGS).map((part, i) =>
                part.hit ? (
                  <mark
                    key={i}
                    className="rounded-sm bg-red-50 text-red-800 underline decoration-red-400 decoration-wavy decoration-1 underline-offset-4"
                  >
                    {part.text}
                  </mark>
                ) : (
                  <span key={i}>{part.text}</span>
                )
              )}
            </p>
            <p className="text-xs text-gray-500 mt-3">An example of what a generic AI tool writes, for comparison.</p>
          </div>
          <ul className="mt-auto px-5 sm:px-6 py-3 bg-red-50/60 border-t border-red-100 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-red-800">
            <li className="flex items-center gap-1.5">
              <i className="ti ti-alert-triangle text-sm" aria-hidden="true" />
              {`${clicheCount} AI clichés`}
            </li>
            <li className="flex items-center gap-1.5">
              <i className="ti ti-ban text-sm" aria-hidden="true" />
              {`${bannedCount} of Riley’s banned words`}
            </li>
            <li className="flex items-center gap-1.5">
              <i className="ti ti-repeat text-sm" aria-hidden="true" />
              {GENERIC_OPENINGS.detail}
            </li>
          </ul>
        </div>

        <div id="compare-panel-voice" role="tabpanel" aria-labelledby="compare-tab-voice" className={panel("voice")}>
          <div className="px-5 sm:px-6 py-5">
            <HighlightedLetter content={VOICE_EXCERPT} claims={VOICE_CLAIMS} lightOnly />
            <p className="text-xs text-gray-500 mt-3">
              From Riley&apos;s demo letter. Hover a highlight to see the note it came from.
            </p>
          </div>
          <ul className="mt-auto px-5 sm:px-6 py-3 bg-emerald-50/70 border-t border-emerald-100 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-emerald-800">
            <li className="flex items-center gap-1.5">
              <i className="ti ti-circle-check text-sm" aria-hidden="true" />
              {VOICE_FLAGS.length === 0 ? "No clichés or banned words" : `${VOICE_FLAGS.length} flagged phrases`}
            </li>
            <li className="flex items-center gap-1.5">
              <i className="ti ti-shield-check text-sm" aria-hidden="true" />
              {`${VOICE_CLAIMS.length} claims traced to Riley’s notes`}
            </li>
            <li className="flex items-center gap-1.5">
              <i className="ti ti-wave-sine text-sm" aria-hidden="true" />
              {VOICE_OPENINGS.detail}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
