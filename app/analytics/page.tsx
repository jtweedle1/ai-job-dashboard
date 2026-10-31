"use client";

import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getJobs } from "@/lib/jobs";
import { getSourceStats, getWeeklyApplications, type SourceStat } from "@/lib/analytics";
import type { Job } from "@/types/job";
import PageFrame from "@/components/ui/PageFrame";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/bits";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

// A rate from one or two applications says nothing, so a source needs this many before it gets one.
const MIN_FOR_RATE = 3;

// Recharts draws SVG attributes, which can't read CSS variables, so the theme's colors are read here.
// The theme toggle flips a class on <html> after React renders, so watch the class itself.
function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function useChartColors() {
  const dark = useSyncExternalStore(
    subscribeToTheme,
    () => document.documentElement.classList.contains("dark"),
    () => false
  );
  return useMemo(() => {
    if (typeof document === "undefined") return { mark: "#5f57d2", rule: "#e4dacb", text: "#57516b", well: "#efe7da" };
    const css = getComputedStyle(document.documentElement);
    const v = (name: string) => css.getPropertyValue(name).trim();
    return { mark: v("--chart"), rule: v("--rule"), text: v("--ink-soft"), well: v("--well") };
    // `dark` isn't read directly; it's what changes the variables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);
}

type Colors = ReturnType<typeof useChartColors>;

function ChartTooltip(props: Record<string, unknown>) {
  const { active, payload, label, unit } = props as {
    active?: boolean;
    payload?: Array<{ name: string; value: number }>;
    label?: string;
    unit?: string;
  };
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-field bg-raised shadow-overlay text-meta">
      <p className="font-semibold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-ink-soft">
          {p.name}: <span className="font-semibold text-ink tabular-nums">{p.value}{unit}</span>
        </p>
      ))}
    </div>
  );
}

// One chart: a title, a sentence that says what it shows, the picture, and the same numbers as a table
// for anyone who'd rather read them (screen readers always get the table).
function Chart({
  id,
  title,
  summary,
  empty,
  table,
  children,
}: {
  id: string;
  title: string;
  summary: React.ReactNode;
  empty?: React.ReactNode;
  table: { columns: [string, string]; rows: [string, string | number][] };
  children: React.ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section aria-labelledby={`${id}-title`} className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`${id}-title`} className="font-serif text-heading font-semibold text-ink">
          {title}
        </h2>
        {!empty && (
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}
            className="shrink-0 h-8 px-3 -mr-3 rounded-full text-meta font-semibold text-action hover:bg-well transition-colors duration-100"
          >
            {asTable ? "Show as chart" : "Show as table"}
          </button>
        )}
      </div>
      <p className="mt-1 mb-5 text-ink-soft text-pretty">{empty ?? summary}</p>
      {!empty && (
        <>
          {!asTable && <div aria-hidden="true">{children}</div>}
          <table className={asTable ? "w-full text-left" : "sr-only"}>
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-rule">
                <th scope="col" className="py-2 text-label font-semibold text-ink-soft">{table.columns[0]}</th>
                <th scope="col" className="py-2 text-label font-semibold text-ink-soft text-right">{table.columns[1]}</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map(([k, v]) => (
                <tr key={k} className="border-b border-rule last:border-b-0">
                  <th scope="row" className="py-2 font-normal text-ink">{k}</th>
                  <td className="py-2 text-right tabular-nums text-ink">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

function axes(c: Colors) {
  const tick = { fontSize: 12, fill: c.text };
  return { tick, grid: <CartesianGrid vertical={false} stroke={c.rule} /> };
}

function SourceBars({ data, dataKey, name, unit, c, domain }: { data: SourceStat[]; dataKey: keyof SourceStat; name: string; unit?: string; c: Colors; domain?: [number, number] }) {
  const { tick, grid } = axes(c);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: -16, bottom: 0 }} barCategoryGap="30%">
        {grid}
        <XAxis dataKey="source" tick={tick} axisLine={{ stroke: c.rule }} tickLine={false} />
        <YAxis allowDecimals={false} domain={domain} tick={tick} tickFormatter={(v) => `${v}${unit ?? ""}`} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: c.well }} />
        <Bar dataKey={dataKey} name={name} fill={c.mark} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function AnalyticsPage() {
  const { user } = useAuth();
  const c = useChartColors();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getJobs(user.uid).then((j) => {
      setJobs(j);
      setLoading(false);
    });
  }, [user]);

  const sourceStats = useMemo(() => getSourceStats(jobs), [jobs]);
  const weeklyData = useMemo(() => getWeeklyApplications(jobs, 12), [jobs]);
  const totalApplied = jobs.filter((j) => j.stage !== "saved").length;

  if (loading) {
    return (
      <PageFrame width="wide" title="Progress">
        <div aria-busy="true" role="status" className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-14">
          <span className="sr-only">Loading your progress…</span>
          {[1, 2].map((n) => (
            <div key={n} className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
              <Skeleton className="h-52" />
            </div>
          ))}
        </div>
      </PageFrame>
    );
  }

  const bySource = [...sourceStats].sort((a, b) => b.applications - a.applications);
  const leaders = bySource.filter((s) => s.applications === bySource[0]?.applications);

  const last4 = weeklyData.slice(-4).reduce((n, w) => n + w.count, 0);
  const prev4 = weeklyData.slice(-8, -4).reduce((n, w) => n + w.count, 0);

  const rated = sourceStats.filter((s) => s.applications >= MIN_FOR_RATE);
  const bestReply = [...rated].sort((a, b) => b.responseRate - a.responseRate)[0];
  const converted = sourceStats.filter((s) => s.interviews >= MIN_FOR_RATE);
  const bestOffer = [...converted].sort((a, b) => b.conversionRate - a.conversionRate)[0];

  return (
    <PageFrame
      width="wide"
      title="Progress"
      intro={`${plural(totalApplied, "application")} sent so far. Saved jobs aren't counted.`}
    >
      {totalApplied === 0 ? (
        <EmptyState
          title="Nothing to chart yet"
          action={
            <Link href="/applications" className={buttonClasses({ variant: "secondary" })}>
              Go to your jobs
            </Link>
          }
        >
          Once you mark a job as applied, you&apos;ll see where your applications go and which ones hear back.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-16">
          <Chart
            id="by-source"
            title="Where you applied"
            summary={
              leaders.length === 1
                ? `Most came from ${leaders[0].source}: ${leaders[0].applications} of ${totalApplied}.`
                : leaders.length > 1 &&
                  `${leaders.map((s) => s.source).join(" and ").replace(/ and (?=.* and )/g, ", ")} lead with ${leaders[0].applications} each, out of ${totalApplied}.`
            }
            empty={sourceStats.length === 0 ? "Not enough data yet." : undefined}
            table={{ columns: ["Source", "Applications"], rows: bySource.map((s) => [s.source, s.applications]) }}
          >
            <SourceBars data={bySource} dataKey="applications" name="Applications" c={c} />
          </Chart>

          <Chart
            id="over-time"
            title="Applications over time"
            summary={`${plural(last4, "application")} in the last four weeks, ${prev4} in the four before.`}
            empty={weeklyData.every((w) => w.count === 0) ? "None sent in the last 12 weeks." : undefined}
            table={{ columns: ["Week of", "Applications"], rows: weeklyData.map((w) => [w.week, w.count]) }}
          >
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                {axes(c).grid}
                <XAxis dataKey="week" tick={axes(c).tick} axisLine={{ stroke: c.rule }} tickLine={false} interval={2} />
                <YAxis allowDecimals={false} tick={axes(c).tick} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: c.rule }} />
                <Line
                  type="linear"
                  dataKey="count"
                  name="Applications"
                  stroke={c.mark}
                  strokeWidth={2}
                  dot={{ r: 4, fill: c.mark, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: c.mark, strokeWidth: 2, stroke: c.well }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Chart>

          <Chart
            id="replies"
            title="Which sources hear back"
            summary={
              bestReply &&
              `${bestReply.source} does best: ${bestReply.interviews > 0 ? `${bestReply.responseRate}% of applications` : "none so far"} reached a screen or interview.`
            }
            empty={rated.length === 0 ? `A source needs ${MIN_FOR_RATE} applications before its reply rate means anything.` : undefined}
            table={{ columns: ["Source", "Reached a screen or interview"], rows: rated.map((s) => [s.source, `${s.responseRate}%`]) }}
          >
            <SourceBars data={rated} dataKey="responseRate" name="Reply rate" unit="%" domain={[0, 100]} c={c} />
          </Chart>

          <Chart
            id="offers"
            title="Interviews that became offers"
            summary={bestOffer && `${bestOffer.source} leads: ${bestOffer.conversionRate}% of interviews turned into an offer.`}
            empty={converted.length === 0 ? `Shows once a source has ${MIN_FOR_RATE} interviews.` : undefined}
            table={{ columns: ["Source", "Offer rate"], rows: converted.map((s) => [s.source, `${s.conversionRate}%`]) }}
          >
            <SourceBars data={converted} dataKey="conversionRate" name="Offer rate" unit="%" domain={[0, 100]} c={c} />
          </Chart>
        </div>
      )}
    </PageFrame>
  );
}
