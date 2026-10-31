import Link from "next/link";
import type { WeekSummary } from "@/lib/today";

// This week's real activity, and a way into the weekly review. No praise, no glow: just the facts,
// and only the ones that happened.
export default function WeekCard({ week }: { week: WeekSummary }) {
  const stats = [
    { n: week.applied, one: "application sent", many: "applications sent" },
    { n: week.letters, one: "letter written", many: "letters written" },
    { n: week.interviews, one: "interview written up", many: "interviews written up" },
  ].filter((s) => s.n > 0);

  return (
    <section aria-labelledby="this-week">
      <h2 id="this-week" className="mb-2 text-label font-semibold text-ink-soft">This week</h2>
      {stats.length === 0 ? (
        <p className="text-ink-soft">A quiet week so far.</p>
      ) : (
        <ul className="space-y-1">
          {stats.map((s) => (
            <li key={s.one} className="flex items-baseline gap-2.5 text-ink-soft">
              <span className="min-w-6 text-right font-serif font-semibold text-heading text-ink tabular-nums">{s.n}</span>
              {s.n === 1 ? s.one : s.many}
            </li>
          ))}
        </ul>
      )}
      {week.reviewed ? (
        <Link href="/weekly-review" className="mt-4 inline-flex items-center gap-1.5 text-control text-ink-soft hover:text-ink">
          <i className="ti ti-check text-moss" aria-hidden="true" />
          Reviewed this week
        </Link>
      ) : (
        <Link
          href="/weekly-review"
          className={
            week.reviewDue
              ? "mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-control text-control font-semibold text-ink hover:bg-well transition-colors duration-100"
              : "mt-4 inline-flex items-center gap-1.5 text-control font-semibold text-action hover:underline underline-offset-4"
          }
        >
          {week.reviewDue ? "Time for your weekly review" : "Weekly review"}
          <i className="ti ti-arrow-right" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
