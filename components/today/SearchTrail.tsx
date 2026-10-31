import Link from "next/link";
import Trail, { type TrailStop } from "@/components/ui/Trail";
import type { TrailStation } from "@/lib/today";

function stationName(s: TrailStation): string {
  if (s.count === 0) return `${s.label}, none`;
  const names = [...s.names, ...(s.more ? [`${s.more} more`] : [])].join(", ");
  return `${s.label}, ${s.count} job${s.count !== 1 ? "s" : ""}: ${names}`;
}

// Where every open job sits, drawn as the trail. The sun sits on the furthest station you've reached;
// the stretch behind it is walked. Each station opens the filtered list.
export default function SearchTrail({ stations, closed }: { stations: TrailStation[]; closed: number }) {
  let furthest = -1;
  stations.forEach((s, i) => {
    if (s.count > 0) furthest = i;
  });

  const stops: TrailStop[] = stations.map((s, i) => ({
    id: s.id,
    href: `/applications?stage=${s.filter}`,
    ariaLabel: stationName(s),
    state: i === furthest ? "current" : i < furthest ? "done" : "upcoming",
    label: (
      <>
        {s.label}
        {s.count > 0 && <span className="ml-1 font-normal text-ink-muted tabular-nums">{s.count}</span>}
      </>
    ),
    detail: s.count > 0 ? <span className="line-clamp-2">{`${s.names.join(", ")}${s.more ? ` +${s.more}` : ""}`}</span> : undefined,
  }));

  return (
    <section aria-labelledby="your-trail">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 id="your-trail" className="font-serif text-heading font-semibold text-ink">
          Your trail
        </h2>
        {closed > 0 && (
          <Link href="/applications?stage=closed" className="text-meta text-action hover:underline underline-offset-4">
            {closed} closed
          </Link>
        )}
      </div>
      <Trail stops={stops} label="Your trail" />
    </section>
  );
}
