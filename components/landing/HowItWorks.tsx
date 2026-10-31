import { HighlightedLetter } from "@/components/LetterReview";
import { BANNED_PHRASES, LETTER_CHECKS, STORY, UNTRACED_CLAIM, VOICE_STATS } from "@/lib/landing-showcase";

// Fills a bar to a share of its max, for the voice fingerprint.
function Meter({ label, value, max, display }: { label: string; value: number; max: number; display: string }) {
  return (
    <div>
      <div className="flex justify-between gap-3 text-meta mb-1.5">
        <span className="text-ink-soft">{label}</span>
        <span className="font-semibold text-ink tabular-nums">{display}</span>
      </div>
      <div className="h-1.5 rounded-full bg-well overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full bg-ink-soft" style={{ width: `${Math.max(4, Math.min(100, (value / max) * 100))}%` }} />
      </div>
    </div>
  );
}

// One stop on the trail: a node on the line, what happens, and an excerpt from Riley's demo that shows it.
function Stop({ title, body, last, children }: { title: string; body: string; last?: boolean; children: React.ReactNode }) {
  return (
    <li className="relative pl-10 sm:pl-14 pb-16 last:pb-0">
      {!last && <span className="absolute left-[7px] sm:left-[15px] top-6 bottom-0 w-0.5 rounded-full bg-ink-soft/40" aria-hidden="true" />}
      <span
        className={`absolute left-0 sm:left-2 top-1.5 w-4 h-4 rounded-full ${last ? "bg-sun" : "bg-canvas border-2 border-ink-soft"}`}
        aria-hidden="true"
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] gap-6 lg:gap-12 items-start">
        <div>
          <h3 className="font-serif text-heading font-semibold text-ink">{title}</h3>
          <p className="mt-2 text-ink-soft text-pretty max-w-md">{body}</p>
        </div>
        <div className="bg-sheet rounded-sheet shadow-sheet p-5 sm:p-6">{children}</div>
      </div>
    </li>
  );
}

const caption = "text-label font-semibold text-ink-soft mb-3";

export default function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      <h2 id="how-heading" className="font-serif text-title font-semibold text-ink">
        How it gets there
      </h2>
      <p className="mt-2 mb-12 text-ink-soft max-w-lg text-pretty">
        Three things a generic tool doesn&apos;t have: how you write, what you&apos;ve done, and a check before you send.
      </p>

      <ol>
        <Stop title="It learns how you write" body="Add a few things you've written. Wayfinder measures them, so the voice comes from your habits, not a guess.">
          <p className={caption}>Riley&apos;s voice, from one past letter</p>
          <div className="space-y-4">
            <Meter label="Average sentence" value={VOICE_STATS.avgSentenceWords} max={35} display={`${VOICE_STATS.avgSentenceWords} words`} />
            <Meter
              label="Contractions"
              value={VOICE_STATS.contractionsPer100Words}
              max={8}
              display={`${VOICE_STATS.contractionsPer100Words} per 100 words`}
            />
            <div className="flex justify-between gap-3 text-meta">
              <span className="text-ink-soft">Signs off with</span>
              <span className="font-semibold text-ink">&ldquo;{VOICE_STATS.signOffs[0]}&rdquo;</span>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-rule">
            <p className="text-meta text-ink-soft mb-2">Never says</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-meta text-ink-muted">
              {BANNED_PHRASES.map((p) => (
                <li key={p} className="line-through decoration-caution">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </Stop>

        <Stop title="It uses your real stories" body="Write up the stories behind each job once. Letters and answers draw from them instead of rewording your resume.">
          <figure>
            <figcaption className={caption}>
              {STORY.source}: {STORY.question}
            </figcaption>
            <blockquote className="text-ui leading-relaxed text-ink-soft">{STORY.text}</blockquote>
          </figure>
          <div className="mt-5 pt-4 border-t border-rule">
            <p className={caption}>In the Northwind Care letter</p>
            <HighlightedLetter
              content={STORY.letterLine}
              claims={[{ quote: STORY.letterLine, source: STORY.source, evidence: STORY.text }]}
              compact
            />
          </div>
        </Stop>

        <Stop
          last
          title="It checks before you send"
          body="Every letter is run against your banned words, common AI phrases, and your own notes. Anything you never said is flagged."
        >
          <ul className="space-y-2.5">
            {LETTER_CHECKS.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-meta">
                <i className="ti ti-circle-check text-moss text-base" aria-hidden="true" />
                <span>
                  <span className="font-semibold text-ink">{c.label}</span>
                  <span className="block text-ink-soft">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5 pt-4 border-t border-rule">
            <p className={caption}>From another demo letter</p>
            <HighlightedLetter content={`${UNTRACED_CLAIM.quote}.`} claims={[UNTRACED_CLAIM]} compact />
            <p className="flex items-start gap-1.5 text-meta text-ink mt-3">
              <i className="ti ti-alert-triangle text-caution text-base" aria-hidden="true" />
              Not in Riley&apos;s notes, so it&apos;s flagged before it goes out.
            </p>
          </div>
        </Stop>
      </ol>
    </section>
  );
}
