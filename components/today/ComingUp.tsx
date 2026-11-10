import Link from "next/link";
import { dayLabel } from "@/lib/next-steps";
import type { UpcomingInterview } from "@/lib/today";

// Interviews on the calendar, on their own field so they don't float. Hidden entirely when there are none.
export default function ComingUp({ interviews, now }: { interviews: UpcomingInterview[]; now: Date }) {
  if (interviews.length === 0) return null;
  return (
    <section aria-labelledby="coming-up" className="bg-sheet rounded-sheet p-6">
      <h2 id="coming-up" className="mb-3 font-display text-heading font-semibold text-ink">Coming up</h2>
      <ul>
        {interviews.map((i) => (
          <li key={i.jobId} className="border-t border-rule first:border-t-0">
            <Link href={`/applications/${i.jobId}?step=interview`} className="group flex items-start gap-3 py-3 rounded-stamp outline-offset-4">
              <span className="shrink-0 px-3 py-1 rounded-full bg-well text-meta font-semibold text-ink">{dayLabel(i.date, now)}</span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink group-hover:text-action transition-colors duration-100">{i.company}</span>
                <span className="block text-meta text-ink-soft">
                  {i.kind} · {i.title}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
