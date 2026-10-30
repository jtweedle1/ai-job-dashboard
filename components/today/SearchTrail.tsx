import Link from "next/link";
import type { TrailStation } from "@/lib/today";

function stationName(s: TrailStation): string {
  if (s.count === 0) return `${s.label}, none`;
  const names = [...s.names, ...(s.more ? [`${s.more} more`] : [])].join(", ");
  return `${s.label}, ${s.count} job${s.count !== 1 ? "s" : ""}: ${names}`;
}

// Where every open job sits, drawn like the step rail on a job page (a 2×2 grid on phones).
// Each station opens the filtered list.
export default function SearchTrail({ stations, closed }: { stations: TrailStation[]; closed: number }) {
  return (
    <section aria-labelledby="your-trail" className="surface p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 id="your-trail" className="section-label">Your trail</h2>
        {closed > 0 && (
          <Link href="/applications?stage=closed" className="text-xs text-primary-700 dark:text-primary-300 hover:underline">
            {closed} closed
          </Link>
        )}
      </div>
      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-y-2">
        {stations.map((s, i) => (
          <li key={s.id} className="relative">
            {i > 0 && <span className="hidden sm:block absolute top-[11px] right-1/2 w-full h-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />}
            <Link
              href={`/applications?stage=${s.filter}`}
              aria-label={stationName(s)}
              className="relative flex flex-col items-center text-center gap-1 px-2 pb-2 rounded-2xl hover:bg-white/70 dark:hover:bg-white/5 transition-colors"
            >
              <span className="relative z-10 h-6 flex items-center justify-center gap-1" aria-hidden="true">
                {s.count === 0 ? (
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
                ) : s.dots > 0 ? (
                  Array.from({ length: s.dots }, (_, d) => (
                    <span key={d} className="w-2.5 h-2.5 rounded-full bg-primary-500 ring-2 ring-white dark:ring-gray-900" />
                  ))
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-primary-600 text-white text-xs font-bold ring-2 ring-white dark:ring-gray-900 tabular-nums">
                    {s.count}
                  </span>
                )}
              </span>
              <span className="font-display font-bold text-sm text-gray-900 dark:text-gray-50">
                {s.label}
                {s.dots > 0 && <span className="ml-1 font-sans font-medium text-xs text-gray-500 dark:text-gray-400 tabular-nums">{s.count}</span>}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {s.count === 0 ? "—" : `${s.names.join(", ")}${s.more ? ` +${s.more}` : ""}`}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
