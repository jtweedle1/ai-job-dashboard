import Link from "next/link";
import type { WeekSummary } from "@/lib/today";

// This week's real activity, and a way into the weekly review, on Today's coral field. No praise:
// just the facts, and only the ones that happened. Inside the field every ink is the field's own.
export default function WeekCard({ week }: { week: WeekSummary }) {
  const stats = [
    { n: week.applied, one: "application sent", many: "applications sent" },
    { n: week.letters, one: "letter written", many: "letters written" },
    { n: week.interviews, one: "interview written up", many: "interviews written up" },
  ].filter((s) => s.n > 0);

  return (
    <section
      aria-labelledby="this-week"
      className="bg-warm text-on-warm rounded-sheet p-6 [--ink:var(--on-warm)] [--ink-soft:var(--on-warm)] [--action:var(--on-warm)] [--control:var(--on-warm)] [--moss:var(--on-warm)] [--well:rgb(255_255_255/0.25)]"
    >
      <h2 id="this-week" className="mb-3 font-display text-heading font-semibold">This week</h2>
      {stats.length === 0 ? (
        <p className="text-ink-soft">A quiet week so far.</p>
      ) : (
        <ul className="space-y-1">
          {stats.map((s) => (
            <li key={s.one} className="flex items-baseline gap-2.5 text-ink-soft">
              <span className="min-w-8 text-right font-display font-semibold text-title text-ink tabular-nums">{s.n}</span>
              {s.n === 1 ? s.one : s.many}
            </li>
          ))}
        </ul>
      )}
      {week.reviewed ? (
        <Link href="/weekly-review" className="mt-4 inline-flex items-center gap-1.5 text-ui text-ink-soft hover:text-ink">
          <i className="ti ti-check text-moss" aria-hidden="true" />
          Reviewed this week
        </Link>
      ) : (
        <Link
          href="/weekly-review"
          className={
            week.reviewDue
              ? "mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-control text-ui font-semibold text-ink hover:bg-well transition-colors duration-100"
              : "mt-4 inline-flex items-center gap-1.5 text-ui font-semibold text-action hover:underline underline-offset-4"
          }
        >
          {week.reviewDue ? "Time for your weekly review" : "Weekly review"}
          <i className="ti ti-arrow-right" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
