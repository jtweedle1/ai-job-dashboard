import { JOURNEY, SHOWCASE_JOB } from "@/lib/landing-showcase";
import { Monogram, StageIndicator } from "@/components/ui/bits";

const extras = ["Application tracker", "Company research", "Source analytics", "Weekly review"];

// "One job, one place": everything the demo job carries, as a small sheet in the shape of the job page.
export default function JobJourney() {
  return (
    <section aria-labelledby="journey-heading" className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-12 items-center">
        <div>
          <h2 id="journey-heading" className="font-serif text-title font-semibold text-ink">
            One job, one place
          </h2>
          <p className="mt-2 text-ink-soft text-pretty">
            Each application carries its own fit score, letter, interview prep, and debrief, so the story you told in
            the letter is right there when you prep for the interview. What you learn in the debrief shapes the next one.
          </p>
          <p className="mt-6 text-label font-semibold text-ink-soft">Also included</p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-ink">
            {extras.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>

        <div className="bg-sheet rounded-sheet shadow-sheet p-5 sm:p-8">
          <div className="flex items-center gap-3 min-w-0">
            <Monogram name={SHOWCASE_JOB.company} />
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg font-semibold text-ink">{SHOWCASE_JOB.title}</p>
              <p className="text-meta text-ink-soft">{SHOWCASE_JOB.company}</p>
            </div>
            <StageIndicator stage="interview" />
          </div>
          <ol className="mt-6">
            {JOURNEY.map((step, i) => {
              const current = i === JOURNEY.length - 1;
              return (
                <li key={step.label} className="relative pl-8 pb-5 last:pb-0">
                  {!current && <span className="absolute left-[7px] top-5 bottom-0 w-0.5 rounded-full bg-ink-soft/40" aria-hidden="true" />}
                  {current ? (
                    <span className="absolute left-0 top-0.5 w-4 h-4 rounded-full bg-sun" aria-hidden="true" />
                  ) : (
                    <span className="absolute left-0.5 top-1 w-3 h-3 rounded-full bg-ink-soft flex items-center justify-center" aria-hidden="true">
                      <i className="ti ti-check text-[9px] text-sheet" />
                    </span>
                  )}
                  <p className="font-semibold text-ink">{step.label}</p>
                  <p className="text-meta text-ink-soft text-pretty">{step.detail}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
