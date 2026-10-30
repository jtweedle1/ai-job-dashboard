import Link from "next/link";
import type { WeekSummary } from "@/lib/today";

// This week's real activity, and a way into the weekly review. No praise, no glow: just the facts.
export default function WeekCard({ week }: { week: WeekSummary }) {
  const stats = [
    { n: week.applied, one: "application sent", many: "applications sent" },
    { n: week.letters, one: "letter written", many: "letters written" },
    { n: week.interviews, one: "interview debriefed", many: "interviews debriefed" },
  ];
  const quiet = stats.every((s) => s.n === 0);

  return (
    <section aria-labelledby="this-week" className="surface p-5">
      <h2 id="this-week" className="section-label mb-2">This week</h2>
      {quiet ? (
        <p className="text-sm text-gray-600 dark:text-gray-300">A quiet week so far.</p>
      ) : (
        <ul className="space-y-1">
          {stats.map((s) => (
            <li key={s.one} className="flex items-baseline gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="w-6 text-right font-display font-extrabold text-lg text-gray-900 dark:text-gray-50 tabular-nums">{s.n}</span>
              {s.n === 1 ? s.one : s.many}
            </li>
          ))}
        </ul>
      )}
      {week.reviewed ? (
        <Link href="/weekly-review" className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary-700 dark:text-primary-300 hover:underline">
          <i className="ti ti-circle-check text-sm" aria-hidden="true" />
          Reviewed this week
        </Link>
      ) : (
        <Link
          href="/weekly-review"
          className={`mt-4 inline-flex items-center gap-1.5 text-sm font-medium rounded-full transition-colors ${
            week.reviewDue
              ? "px-4 py-2 text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950 hover:bg-primary-100 dark:hover:bg-primary-900"
              : "text-primary-700 dark:text-primary-300 hover:underline"
          }`}
        >
          <i className="ti ti-calendar-heart text-sm" aria-hidden="true" />
          {week.reviewDue ? "Time for your weekly review" : "Weekly review"}
        </Link>
      )}
    </section>
  );
}
