// Pure: works out where each job is in the workflow and what to do next. No Firebase, safe anywhere.

import { STAGE_META, type Job } from "@/types/job";

export type JobStep = "decide" | "apply" | "interview" | "debrief" | "outcome";

export const JOB_STEPS: { id: JobStep; label: string; icon: string }[] = [
  { id: "decide", label: "Decide", icon: "ti-compass" },
  { id: "apply", label: "Apply", icon: "ti-mail" },
  { id: "interview", label: "Interview", icon: "ti-microphone" },
  { id: "debrief", label: "Debrief", icon: "ti-notes" },
  { id: "outcome", label: "Outcome", icon: "ti-flag" },
];

export interface JobActivity {
  letters: number;
  preps: number;
  debriefs: number;
}

export interface NextAction {
  jobId: string;
  title: string;
  company: string;
  action: string;
  detail: string;
  step: JobStep;
  priority: number;
}

const FINAL_STAGES = new Set(["offer", "rejected", "withdrawn"]);
const INTERVIEWING = new Set(["phone_screen", "interview"]);
export const FOLLOW_UP_DAYS = 14;

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

// At most one action per job, most pressing first.
export function nextActions(
  jobs: Job[],
  activity: (jobId: string) => JobActivity,
  now: Date = new Date()
): NextAction[] {
  const actions: NextAction[] = [];
  const updated = new Map(jobs.map((j) => [j.id, j.updatedAt.getTime()]));

  for (const job of jobs) {
    const a = activity(job.id);
    const base = { jobId: job.id, title: job.title, company: job.company };
    const add = (priority: number, step: JobStep, action: string, detail: string) =>
      actions.push({ ...base, priority, step, action, detail });

    if (job.stage === "offer") add(0, "outcome", "Weigh your offer", "Congratulations. Take a breath and compare it to your goals.");
    else if (INTERVIEWING.has(job.stage) && a.preps === 0)
      add(1, "interview", `Prep for the ${STAGE_META[job.stage].label.toLowerCase()}`, "Practice questions built from the job description.");
    else if (INTERVIEWING.has(job.stage) && a.debriefs === 0)
      add(3, "debrief", "Note how the interview went", "A quick debrief while it's fresh feeds your stories.");
    else if (job.stage === "saved" && a.letters > 0)
      add(2, "apply", "Send it and mark as applied", "Your letter is ready.");
    else if (job.stage === "saved" && job.fitScore != null)
      add(2, "apply", "Write your letter", `Fit score ${job.fitScore}.`);
    else if (job.stage === "saved") add(4, "decide", "See if it's a fit", "Score it against your goals before you spend time on it.");
    else if (job.stage === "applied") {
      const days = daysBetween(job.appliedAt ?? job.updatedAt, now);
      if (days >= FOLLOW_UP_DAYS) add(3, "decide", "Follow up?", `Applied ${days} days ago and no word yet.`);
    }
  }

  return actions.sort((x, y) => x.priority - y.priority || updated.get(y.jobId)! - updated.get(x.jobId)!);
}
