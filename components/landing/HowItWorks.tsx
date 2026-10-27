import { HighlightedLetter } from "@/components/LetterReview";
import { BANNED_PHRASES, LETTER_CHECKS, STORY, UNTRACED_CLAIM, VOICE_STATS } from "@/lib/landing-showcase";

const card = "bg-white/75 backdrop-blur border border-white rounded-3xl p-6 shadow-sm shadow-gray-900/5 flex flex-col";

function StepHeading({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="mb-5">
      <span className="inline-flex w-7 h-7 rounded-full bg-gradient-to-br from-peach-200 via-rose-200 to-primary-200 items-center justify-center text-xs font-display font-extrabold text-gray-800 mb-3">
        {n}
      </span>
      <h3 className="font-display font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
    </div>
  );
}

// Fills a bar to a share of its max, for the voice fingerprint.
function Meter({ label, value, max, display }: { label: string; value: number; max: number; display: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{display}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
        <div
          className="h-full rounded-full bg-gradient-to-r from-peach-400 to-primary-500"
          style={{ width: `${Math.max(4, Math.min(100, (value / max) * 100))}%` }}
        />
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="max-w-5xl mx-auto px-6 pb-20">
      <div className="text-center mb-8">
        <h2 id="how-heading" className="font-display font-extrabold tracking-tight text-2xl sm:text-3xl text-gray-900 mb-2">
          How it gets there
        </h2>
        <p className="text-gray-600 max-w-lg mx-auto">Three things a generic tool doesn&apos;t have: how you write, what you&apos;ve done, and a check before you send.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={card}>
          <StepHeading n={1} title="It learns how you write" body="Add a few things you've written. Wayfinder measures them, so the voice comes from your habits, not a guess." />
          <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-3">
            <p className="text-xs font-medium text-gray-500">Riley&apos;s voice, from one past letter</p>
            <Meter label="Average sentence" value={VOICE_STATS.avgSentenceWords} max={35} display={`${VOICE_STATS.avgSentenceWords} words`} />
            <Meter
              label="Contractions"
              value={VOICE_STATS.contractionsPer100Words}
              max={8}
              display={`${VOICE_STATS.contractionsPer100Words} per 100 words`}
            />
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Signs off with</span>
              <span className="font-medium text-gray-900">&ldquo;{VOICE_STATS.signOffs[0]}&rdquo;</span>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-600 mb-2">Never says</p>
              <ul className="flex flex-wrap gap-1.5">
                {BANNED_PHRASES.map((p) => (
                  <li key={p} className="text-xs text-gray-500 line-through decoration-red-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className={card}>
          <StepHeading n={2} title="It uses your real stories" body="Write up the stories behind each job once. Letters and answers draw from them instead of rewording your resume." />
          <div className="space-y-2">
            <figure className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
              <figcaption className="text-xs font-medium text-gray-500 mb-1.5">
                {STORY.source} · {STORY.question}
              </figcaption>
              <blockquote className="text-sm text-gray-700 leading-relaxed">{STORY.text}</blockquote>
            </figure>
            <div className="flex justify-center text-primary-500" aria-hidden="true">
              <i className="ti ti-arrow-down text-lg" />
            </div>
            <div className="rounded-2xl bg-white border border-primary-100 p-4">
              <p className="text-xs font-medium text-gray-500 mb-1.5">In the Northwind Care letter</p>
              <HighlightedLetter
                content={STORY.letterLine}
                claims={[{ quote: STORY.letterLine, source: STORY.source, evidence: STORY.text }]}
                lightOnly
              />
            </div>
          </div>
        </div>

        <div className={card}>
          <StepHeading n={3} title="It checks before you send" body="Every letter is run against your banned words, common AI phrases, and your own notes. Anything you never said is flagged." />
          <div className="space-y-3">
            <ul className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-2">
              {LETTER_CHECKS.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-xs">
                  <i className="ti ti-circle-check text-emerald-600 text-sm mt-px" aria-hidden="true" />
                  <span>
                    <span className="text-gray-800">{c.label}</span>
                    <span className="block text-gray-500">{c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="rounded-2xl bg-white border border-amber-100 p-4">
              <p className="text-xs font-medium text-gray-500 mb-1.5">From another demo letter</p>
              <HighlightedLetter content={`${UNTRACED_CLAIM.quote}.`} claims={[UNTRACED_CLAIM]} lightOnly />
              <p className="flex items-center gap-1.5 text-xs text-amber-800 mt-2">
                <i className="ti ti-alert-triangle text-sm" aria-hidden="true" />
                Not in Riley&apos;s notes, so it&apos;s flagged before it goes out.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
