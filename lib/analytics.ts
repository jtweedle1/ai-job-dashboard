import type { Job, JobSource } from "@/types/job";
import { SOURCE_LABELS } from "@/types/job";

export interface SourceStat {
  source: string;
  applications: number;
  interviews: number;
  offers: number;
  responseRate: number;
  conversionRate: number;
}

export interface WeeklyPoint {
  week: string;
  count: number;
}

const ACTIVE_STAGES = new Set(["applied", "phone_screen", "interview", "offer", "rejected", "withdrawn"]);

export function getSourceStats(jobs: Job[]): SourceStat[] {
  const map = new Map<JobSource, { applications: number; interviews: number; offers: number }>();

  for (const job of jobs) {
    if (!ACTIVE_STAGES.has(job.stage)) continue;
    const entry = map.get(job.source) ?? { applications: 0, interviews: 0, offers: 0 };
    entry.applications++;
    if (job.stage === "phone_screen" || job.stage === "interview") entry.interviews++;
    if (job.stage === "offer") entry.offers++;
    map.set(job.source, entry);
  }

  return Array.from(map.entries())
    .map(([source, data]) => ({
      source: SOURCE_LABELS[source],
      applications: data.applications,
      interviews: data.interviews,
      offers: data.offers,
      responseRate:
        data.applications > 0
          ? Math.round((data.interviews / data.applications) * 100)
          : 0,
      conversionRate:
        data.interviews > 0
          ? Math.round((data.offers / data.interviews) * 100)
          : 0,
    }))
    .sort((a, b) => b.applications - a.applications);
}

export function getWeeklyApplications(jobs: Job[], weeks = 12): WeeklyPoint[] {
  const now = new Date();
  const points: WeeklyPoint[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - i * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const count = jobs.filter((j) => {
      const d = j.appliedAt ?? j.createdAt;
      return d >= weekStart && d < weekEnd && ACTIVE_STAGES.has(j.stage);
    }).length;

    const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    points.push({ week: label, count });
  }

  return points;
}
