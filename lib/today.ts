// Pure: shapes jobs and activity into what the Today page shows. No Firebase, safe anywhere.

import { STAGE_META, type Job, type JobStage, type StageFilter } from "@/types/job";
import { daysUntil, startOfDay, type NextAction } from "@/lib/next-steps";

export interface ActionGroup {
  id: "now" | "week" | "later";
  label: string;
  actions: NextAction[];
}

// Buckets by the engine's priority: 0–1 needs you now, 2–3 this week, the rest whenever.
export function groupActions(actions: NextAction[]): ActionGroup[] {
  const groups: ActionGroup[] = [
    { id: "now", label: "Needs you", actions: [] },
    { id: "week", label: "This week", actions: [] },
    { id: "later", label: "When you have time", actions: [] },
  ];
  for (const a of actions) groups[a.priority <= 1 ? 0 : a.priority <= 3 ? 1 : 2].actions.push(a);
  return groups.filter((g) => g.actions.length > 0);
}

export const TRAIL_MAX_DOTS = 5;
export const TRAIL_MAX_NAMES = 2;

export interface TrailStation {
  id: "saved" | "applied" | "interviewing" | "offer";
  label: string;
  filter: StageFilter;
  count: number;
  // Shown as dots up to TRAIL_MAX_DOTS; past that the station shows its count instead.
  dots: number;
  // Most recently touched companies first.
  names: string[];
  more: number;
}

const STATIONS: { id: TrailStation["id"]; label: string; filter: StageFilter; stages: JobStage[] }[] = [
  { id: "saved", label: "Saved", filter: "saved", stages: ["saved"] },
  { id: "applied", label: "Applied", filter: "applied", stages: ["applied"] },
  { id: "interviewing", label: "Interviewing", filter: "interviewing", stages: ["phone_screen", "interview"] },
  { id: "offer", label: "Offer", filter: "offer", stages: ["offer"] },
];

export function trailStations(jobs: Job[]): { stations: TrailStation[]; closed: number } {
  const byRecent = [...jobs].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const stations = STATIONS.map(({ stages, ...s }) => {
    const here = byRecent.filter((j) => stages.includes(j.stage));
    const names = [...new Set(here.map((j) => j.company))];
    return {
      ...s,
      count: here.length,
      dots: here.length > TRAIL_MAX_DOTS ? 0 : here.length,
      names: names.slice(0, TRAIL_MAX_NAMES),
      more: Math.max(0, names.length - TRAIL_MAX_NAMES),
    };
  });
  const closed = jobs.filter((j) => j.stage === "rejected" || j.stage === "withdrawn").length;
  return { stations, closed };
}

export interface UpcomingInterview {
  jobId: string;
  company: string;
  title: string;
  kind: string;
  date: Date;
}

// Interviews from today through the next two weeks, soonest first.
export function comingUp(jobs: Job[], now: Date, days = 14): UpcomingInterview[] {
  return jobs
    .filter((j) => (j.stage === "phone_screen" || j.stage === "interview") && j.nextInterviewAt)
    .filter((j) => {
      const n = daysUntil(j.nextInterviewAt!, now);
      return n >= 0 && n <= days;
    })
    .map((j) => ({ jobId: j.id, company: j.company, title: j.title, kind: STAGE_META[j.stage].label, date: j.nextInterviewAt! }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

// Weeks start on Sunday, matching the weekly review.
export function weekStart(now: Date): Date {
  const s = startOfDay(now);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

export interface WeekSummary {
  applied: number;
  letters: number;
  interviews: number;
  reviewed: boolean;
  // Friday to Sunday with no review saved for this week yet.
  reviewDue: boolean;
}

export function weekSummary(
  input: { jobs: Job[]; letterDates: Date[]; interviewDates: Date[]; reviewWeeks: Date[] },
  now: Date
): WeekSummary {
  const from = weekStart(now).getTime();
  const inWeek = (d: Date | null) => d != null && d.getTime() >= from && d.getTime() <= now.getTime();
  const reviewed = input.reviewWeeks.some((w) => w.getTime() >= from);
  return {
    applied: input.jobs.filter((j) => inWeek(j.appliedAt)).length,
    letters: input.letterDates.filter(inWeek).length,
    interviews: input.interviewDates.filter(inWeek).length,
    reviewed,
    reviewDue: !reviewed && [5, 6, 0].includes(now.getDay()),
  };
}

// What the tracker already knows about a week, so the weekly review doesn't ask you to recall it.
// An interview is a job on a day; a debrief and the date on the job for the same interview count once.
export function weekCounts(
  input: { jobs: Job[]; debriefs: { jobId: string; interviewDate: Date }[] },
  weekOf: Date
): { applicationsSent: number; interviewsBooked: number } {
  const from = startOfDay(weekOf);
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7);
  const inWeek = (d: Date | null): d is Date => d != null && d >= from && d < to;
  const interviews = new Set<string>();
  for (const j of input.jobs) if (inWeek(j.nextInterviewAt)) interviews.add(`${j.id}:${startOfDay(j.nextInterviewAt).getTime()}`);
  for (const d of input.debriefs) if (inWeek(d.interviewDate)) interviews.add(`${d.jobId}:${startOfDay(d.interviewDate).getTime()}`);
  return {
    applicationsSent: input.jobs.filter((j) => inWeek(j.appliedAt)).length,
    interviewsBooked: interviews.size,
  };
}
