import { JOURNEY, SHOWCASE_JOB } from "@/lib/landing-showcase";

const extras = [
  { icon: "ti-file-text", label: "Application tracker" },
  { icon: "ti-building", label: "Company research" },
  { icon: "ti-chart-bar", label: "Source analytics" },
  { icon: "ti-calendar-week", label: "Weekly review" },
];

// "One job, one place": everything the demo job carries, as a small mock of the job page.
export default function JobJourney() {
  return (
    <section aria-labelledby="journey-heading" className="max-w-5xl mx-auto px-6 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-10 items-center">
        <div>
          <h2 id="journey-heading" className="font-display font-extrabold tracking-tight text-2xl sm:text-3xl text-gray-900 mb-3">
            One job, one place
          </h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            Each application carries its own fit score, letter, interview prep, and debrief, so the story you told in
            the letter is right there when you prep for the interview. What you learn in the debrief shapes the next one.
          </p>
          <ul aria-label="Also included" className="flex flex-wrap gap-2">
            {extras.map((e) => (
              <li key={e.label} className="inline-flex items-center gap-1.5 text-xs text-gray-700 bg-white/75 border border-white px-3 py-1.5 rounded-full">
                <i className={`ti ${e.icon} text-primary-500 text-sm`} aria-hidden="true" />
                {e.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white/80 backdrop-blur border border-white rounded-3xl shadow-lg shadow-primary-900/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-sky-200 to-primary-200 flex items-center justify-center font-display font-extrabold text-gray-800" aria-hidden="true">
                {SHOWCASE_JOB.company[0]}
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-gray-900 truncate">{SHOWCASE_JOB.title}</p>
                <p className="text-xs text-gray-500">{SHOWCASE_JOB.company}</p>
              </div>
            </div>
            <span className="text-xs font-medium text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full shrink-0">Interview</span>
          </div>
          <ol className="px-6 py-5 space-y-0">
            {JOURNEY.map((step, i) => (
              <li key={step.label} className="relative flex gap-4 pb-5 last:pb-0">
                {i < JOURNEY.length - 1 && <span className="absolute left-4 top-9 bottom-1 w-px bg-primary-100" aria-hidden="true" />}
                <span className="w-8 h-8 shrink-0 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center">
                  <i className={`ti ${step.icon} text-base`} aria-hidden="true" />
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-sm font-medium text-gray-900">{step.label}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
