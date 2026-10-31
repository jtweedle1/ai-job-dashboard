import Link from "next/link";
import { dayLabel } from "@/lib/next-steps";
import type { UpcomingInterview } from "@/lib/today";

// Interviews on the calendar. Hidden entirely when there are none.
export default function ComingUp({ interviews, now }: { interviews: UpcomingInterview[]; now: Date }) {
  if (interviews.length === 0) return null;
  return (
    <section aria-labelledby="coming-up">
      <h2 id="coming-up" className="mb-2 text-label font-semibold text-ink-soft">Coming up</h2>
      <ul>
        {interviews.map((i) => (
          <li key={i.jobId} className="border-t border-rule first:border-t-0">
            <Link href={`/applications/${i.jobId}?step=interview`} className="group flex gap-3 py-2.5 rounded-stamp outline-offset-4">
              <span className="shrink-0 w-20 text-meta font-semibold text-sun-ink pt-0.5">{dayLabel(i.date, now)}</span>
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
