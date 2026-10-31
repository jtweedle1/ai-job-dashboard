"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { getJobs } from "@/lib/jobs";
import { getSourceStats, getWeeklyApplications } from "@/lib/analytics";
import type { Job } from "@/types/job";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";

// The chart is a picture; screen readers get the same numbers as a table instead.
function ChartCard({ title, subtitle, children, empty, table }: {
  title: string; subtitle?: string; children: React.ReactNode; empty?: boolean;
  table: { columns: [string, string]; rows: [string, string | number][] };
}) {
  return (
    <div className="surface p-5">
      <div className="mb-4">
        <h2 className="text-sm font-medium text-gray-900 dark:text-gray-50">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {empty ? (
        <div className="h-40 flex items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Not enough data yet.</p>
        </div>
      ) : (
        <>
          <div aria-hidden="true">{children}</div>
          <table className="sr-only">
            <caption>{title}</caption>
            <thead>
              <tr>
                <th scope="col">{table.columns[0]}</th>
                <th scope="col">{table.columns[1]}</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map(([k, v]) => (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { border: "1px solid #e4dff0", borderRadius: "12px", fontSize: "12px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
  labelStyle: { color: "#47425f", fontWeight: 600 },
  itemStyle: { color: "#6f6889" },
};

function PercentTick(props: Record<string, unknown>) {
  const { x, y, payload } = props as { x: number; y: number; payload: { value: number } };
  return <text x={x} y={y} dy={4} textAnchor="end" fill="#6f6889" className="fill-gray-500 dark:fill-gray-400" fontSize={11}>{payload.value}%</text>;
}

function PercentTooltip(props: Record<string, unknown>) {
  const { active, payload, label } = props as { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string };
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...tooltipStyle.contentStyle, padding: "8px 12px" }}>
      <p style={tooltipStyle.labelStyle}>{label}</p>
      {payload.map((p) => <p key={p.name} style={tooltipStyle.itemStyle}>{p.name}: {p.value}%</p>)}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getJobs(user.uid).then((j) => { setJobs(j); setLoading(false); });
  }, [user]);

  const sourceStats = useMemo(() => getSourceStats(jobs), [jobs]);
  const weeklyData = useMemo(() => getWeeklyApplications(jobs, 12), [jobs]);
  const totalApplied = jobs.filter((j) => j.stage !== "saved").length;

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto animate-pulse space-y-4">
        <div className="h-7 bg-gray-100 dark:bg-gray-800 rounded w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => <div key={n} className="h-56 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const hasSourceData = sourceStats.length > 0;
  const hasWeeklyData = weeklyData.some((w) => w.count > 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Progress</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {totalApplied} application{totalApplied !== 1 ? "s" : ""} tracked
        </p>
      </div>

      {totalApplied === 0 ? (
        <div className="surface p-14 text-center">
          <div className="w-10 h-10 rounded-full glow-gradient flex items-center justify-center mx-auto mb-3">
            <i className="ti ti-chart-bar text-gray-700 dark:text-gray-100 text-xl" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No data yet. Start tracking applications to see analytics.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            title="Applications by source"
            subtitle="Where you're finding roles"
            empty={!hasSourceData}
            table={{ columns: ["Source", "Applications"], rows: sourceStats.map((s) => [s.source, s.applications]) }}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sourceStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1eef8" />
                <XAxis dataKey="source" tick={{ fontSize: 11, fill: "#6f6889", className: "fill-gray-500 dark:fill-gray-400" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6f6889", className: "fill-gray-500 dark:fill-gray-400" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle.contentStyle} labelStyle={tooltipStyle.labelStyle} itemStyle={tooltipStyle.itemStyle} cursor={{ fill: "#f1eef8" }} />
                <Bar dataKey="applications" name="Applications" fill="#948df0" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Applications over time"
            subtitle="Last 12 weeks"
            empty={!hasWeeklyData}
            table={{ columns: ["Week", "Applications"], rows: weeklyData.map((w) => [w.week, w.count]) }}
          >
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1eef8" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#6f6889", className: "fill-gray-500 dark:fill-gray-400" }} axisLine={false} tickLine={false} interval={2} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6f6889", className: "fill-gray-500 dark:fill-gray-400" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle.contentStyle} labelStyle={tooltipStyle.labelStyle} itemStyle={tooltipStyle.itemStyle} cursor={{ stroke: "#e4dff0" }} />
                <Line type="monotone" dataKey="count" name="Applications" stroke="#948df0" strokeWidth={2} dot={{ r: 3, fill: "#948df0", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#948df0", strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Response rate by source"
            subtitle="% of applications that reached phone screen or interview"
            empty={!hasSourceData}
            table={{ columns: ["Source", "Response rate"], rows: sourceStats.map((s) => [s.source, `${s.responseRate}%`]) }}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sourceStats} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1eef8" />
                <XAxis dataKey="source" tick={{ fontSize: 11, fill: "#6f6889", className: "fill-gray-500 dark:fill-gray-400" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={<PercentTick />} axisLine={false} tickLine={false} />
                <Tooltip content={<PercentTooltip />} cursor={{ fill: "#f1eef8" }} />
                <Bar dataKey="responseRate" name="Response rate" fill="#ff9f6e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Interview-to-offer conversion"
            subtitle="% of interviews that resulted in an offer"
            empty={!hasSourceData || sourceStats.every((s) => s.interviews === 0)}
            table={{ columns: ["Source", "Offer rate"], rows: sourceStats.map((s) => [s.source, `${s.conversionRate}%`]) }}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sourceStats} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1eef8" />
                <XAxis dataKey="source" tick={{ fontSize: 11, fill: "#6f6889", className: "fill-gray-500 dark:fill-gray-400" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={<PercentTick />} axisLine={false} tickLine={false} />
                <Tooltip content={<PercentTooltip />} cursor={{ fill: "#f1eef8" }} />
                <Bar dataKey="conversionRate" name="Conversion rate" fill="#f07aa8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
