import Link from "next/link";
import { dayLabel } from "@/lib/next-steps";
import type { UpcomingInterview } from "@/lib/today";

// Interviews on the calendar. Hidden entirely when there are none.
export default function ComingUp({ interviews, now }: { interviews: UpcomingInterview[]; now: Date }) {
  if (interviews.length === 0) return null;
  return (
    <section aria-labelledby="coming-up" className="surface p-5">
      <h2 id="coming-up" className="section-label mb-2">Coming up</h2>
      <ul className="space-y-1">
        {interviews.map((i) => (
          <li key={i.jobId}>
            <Link
              href={`/applications/${i.jobId}?step=interview`}
              className="flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-white/70 dark:hover:bg-white/5 transition-colors"
            >
              <span className="shrink-0 min-w-[4.5rem] text-center text-xs font-semibold px-2 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                {dayLabel(i.date, now)}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{i.company}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{i.kind} · {i.title}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
