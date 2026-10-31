// Pure: works out where each job is in the workflow and what to do next. No Firebase, safe anywhere.

import { STAGE_META, type Job } from "@/types/job";

export type JobStep = "decide" | "apply" | "interview" | "debrief" | "outcome";

export const JOB_STEPS: { id: JobStep; label: string; icon: string }[] = [
  { id: "decide", label: "Decide", icon: "ti-compass" },
  { id: "apply", label: "Apply", icon: "ti-mail" },
  { id: "interview", label: "Interview", icon: "ti-microphone" },
  { id: "debrief", label: "Interview notes", icon: "ti-notes" },
  { id: "outcome", label: "Outcome", icon: "ti-flag" },
];

export interface JobActivity {
  letters: number;
  preps: number;
  debriefs: number;
}

// What kind of nudge this is, so Today can offer the right quick actions.
export type ActionKind = "offer" | "prep" | "debrief" | "send" | "letter" | "fit" | "follow_up";

export interface NextAction {
  jobId: string;
  title: string;
  company: string;
  action: string;
  detail: string;
  step: JobStep;
  kind: ActionKind;
  priority: number;
  // A short time cue for the row, e.g. "Thursday" or "16 days". Overdue ones are flagged.
  chip?: { text: string; overdue?: boolean };
}

const FINAL_STAGES = new Set(["offer", "rejected", "withdrawn"]);
const INTERVIEWING = new Set(["phone_screen", "interview"]);
export const FOLLOW_UP_DAYS = 14;
// After you chase an application, wait this long before suggesting another nudge.
export const FOLLOW_UP_AGAIN_DAYS = 7;
// Today suggests chasing a quiet application at most this many times, then lets it rest.
// Most quiet applications never answer, and an endless list of chases is just guilt.
export const FOLLOW_UP_NUDGES = 2;
// A saved role's "apply by" day starts showing this many days ahead, and is raised to the top this close.
const APPLY_BY_SOON_DAYS = 7;
const APPLY_BY_URGENT_DAYS = 2;
// Interviews this close get their prep nudge raised to the top.
const PREP_URGENT_DAYS = 2;

export function isStep(value: string | null): value is JobStep {
  return JOB_STEPS.some((s) => s.id === value);
}

export function stepsDone(job: Job, a: JobActivity): Record<JobStep, boolean> {
  return {
    decide: job.fitScore != null || job.stage !== "saved",
    apply: job.stage !== "saved",
    interview: a.preps > 0,
    debrief: a.debriefs > 0,
    outcome: FINAL_STAGES.has(job.stage),
  };
}

// The step a job opens on: wherever its stage says the work is now.
export function suggestedStep(job: Job, a: JobActivity): JobStep {
  if (FINAL_STAGES.has(job.stage)) return "outcome";
  if (INTERVIEWING.has(job.stage)) return a.debriefs > 0 ? "debrief" : "interview";
  if (job.stage === "applied") return "apply";
  return job.fitScore == null && a.letters === 0 ? "decide" : "apply";
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Calendar days from today to the given day: 0 today, 1 tomorrow, -1 yesterday.
export function daysUntil(day: Date, now: Date): number {
  return Math.round((startOfDay(day).getTime() - startOfDay(now).getTime()) / 86_400_000);
}

// "Today", "Tomorrow", a weekday within the week ahead, otherwise "Nov 12".
export function dayLabel(day: Date, now: Date): string {
  const n = daysUntil(day, now);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n > 1 && n < 7) return day.toLocaleDateString("en-US", { weekday: "long" });
  return day.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// For mid-sentence use: "today", "tomorrow", "on Thursday", "on Nov 12".
export function dayPhrase(day: Date, now: Date): string {
  const label = dayLabel(day, now);
  return ["Today", "Tomorrow", "Yesterday"].includes(label) ? label.toLowerCase() : `on ${label}`;
}

// An interview dated today hasn't happened yet as far as we know; it's over from tomorrow.
export function interviewIsPast(job: Job, now: Date): boolean {
  return job.nextInterviewAt != null && daysUntil(job.nextInterviewAt, now) < 0;
}

// A saved role's deadline, if it has one coming up: a chip, and a raised priority when it's close.
function applyByCue(job: Job, now: Date): { chip: NonNullable<NextAction["chip"]>; priority?: number } | null {
  if (!job.applyBy) return null;
  const n = daysUntil(job.applyBy, now);
  if (n < 0) return { chip: { text: "Deadline passed" } };
  if (n > APPLY_BY_SOON_DAYS) return null;
  const day = dayLabel(job.applyBy, now);
  const when = day === "Today" || day === "Tomorrow" ? day.toLowerCase() : day;
  return { chip: { text: `Apply by ${when}` }, priority: n <= APPLY_BY_URGENT_DAYS ? 1 : undefined };
}

// At most one action per job, most pressing first. Snoozed jobs sit out until their snooze ends.
export function nextActions(
  jobs: Job[],
  activity: (jobId: string) => JobActivity,
  now: Date = new Date()
): NextAction[] {
  const actions: NextAction[] = [];
  const updated = new Map(jobs.map((j) => [j.id, j.updatedAt.getTime()]));

  for (const job of jobs) {
    if (job.snoozedUntil && job.snoozedUntil > now) continue;
    const a = activity(job.id);
    const base = { jobId: job.id, title: job.title, company: job.company };
    const add = (priority: number, kind: ActionKind, step: JobStep, action: string, detail: string, chip?: NextAction["chip"]) =>
      actions.push({ ...base, priority, kind, step, action, detail, ...(chip ? { chip } : {}) });

    if (job.stage === "offer") add(0, "offer", "outcome", "Weigh your offer", "Congratulations. Take a breath and compare it to your goals.");
    else if (INTERVIEWING.has(job.stage)) {
      const kind = STAGE_META[job.stage].label.toLowerCase();
      const date = job.nextInterviewAt;
      if (date && interviewIsPast(job, now)) {
        if (a.debriefs === 0)
          add(daysUntil(date, now) <= -3 ? 1 : 2, "debrief", "debrief", `Note how the ${kind} went`, "A few quick notes while it's fresh. They feed your stories.", {
            text: dayLabel(date, now),
            overdue: daysUntil(date, now) <= -3,
          });
      } else if (date) {
        const day = dayLabel(date, now);
        if (a.preps === 0)
          add(daysUntil(date, now) <= PREP_URGENT_DAYS ? 0 : 1, "prep", "interview", `Prep for ${day === "Today" ? "today" : day === "Tomorrow" ? "tomorrow" : day}'s ${kind}`, "Practice questions built from the job description.", { text: day });
      } else if (a.preps === 0) add(1, "prep", "interview", `Prep for the ${kind}`, "Practice questions built from the job description.");
      else if (a.debriefs === 0) add(3, "debrief", "debrief", "Note how the interview went", "A few quick notes while it's fresh. They feed your stories.");
    } else if (job.stage === "saved") {
      const deadline = applyByCue(job, now);
      const p = (base: number) => Math.min(base, deadline?.priority ?? base);
      if (a.letters > 0) add(p(2), "send", "apply", "Send it and mark as applied", "Your letter is ready.", deadline?.chip);
      else if (job.fitScore != null) add(p(2), "letter", "apply", "Write your letter", `Fit score ${job.fitScore}.`, deadline?.chip);
      else add(p(4), "fit", "decide", "See if it's a fit", "Score it against your goals before you spend time on it.", deadline?.chip);
    } else if (job.stage === "applied" && !job.followUpsOff && job.followUps < FOLLOW_UP_NUDGES) {
      // A gentle, optional nudge: the chip is a time cue, never "overdue".
      const applied = daysBetween(job.appliedAt ?? job.updatedAt, now);
      if (job.lastFollowUpAt) {
        const since = daysBetween(job.lastFollowUpAt, now);
        if (since >= FOLLOW_UP_AGAIN_DAYS)
          add(3, "follow_up", "decide", "Follow up again?", `You followed up ${since} days ago and haven't heard back. This is the last reminder.`, { text: `${applied} days` });
      } else if (applied >= FOLLOW_UP_DAYS)
        add(3, "follow_up", "decide", "Follow up?", `Applied ${applied} days ago and no word yet. Optional: many teams never reply.`, { text: `${applied} days` });
    }
  }

  return actions.sort((x, y) => x.priority - y.priority || updated.get(y.jobId)! - updated.get(x.jobId)!);
}
