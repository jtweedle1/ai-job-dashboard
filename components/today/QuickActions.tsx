"use client";

import { useState } from "react";
import { dayLabel, FOLLOW_UP_NUDGES, type NextAction } from "@/lib/next-steps";
import { parseInputDate, toInputDate } from "@/components/job/InterviewDateField";
import type { Job } from "@/types/job";

// The fields Today is allowed to change on a job. Every one of them can be put back by Undo.
export type JobPatch = Partial<
  Pick<Job, "stage" | "appliedAt" | "nextInterviewAt" | "lastFollowUpAt" | "followUps" | "followUpsOff" | "snoozedUntil">
>;
export type Act = (job: Job, patch: JobPatch, message: string) => void;

const SNOOZE_DAYS = 3;

const STYLES = {
  row: "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10",
  hero: "bg-white/60 dark:bg-white/10 text-gray-800 dark:text-gray-100 hover:bg-white/90 dark:hover:bg-white/20",
};

// One-tap updates for a nudge. Only offers changes that resolve or pause it.
export default function QuickActions({
  action,
  job,
  onAct,
  variant = "row",
  now,
}: {
  action: NextAction;
  job: Job;
  onAct: Act;
  variant?: "row" | "hero";
  now: Date;
}) {
  const [picking, setPicking] = useState<"interview" | "date" | null>(null);
  const [date, setDate] = useState(toInputDate(job.nextInterviewAt));
  const btn = `inline-flex items-center gap-1 text-xs font-medium px-3 min-h-8 pointer-coarse:min-h-11 rounded-full transition-colors ${STYLES[variant]}`;
  const co = job.company;

  if (picking) {
    const picked = parseInputDate(date);
    const save = () => {
      if (picking === "interview") onAct(job, { stage: "interview", nextInterviewAt: picked }, `Moved ${co} to interviewing`);
      else onAct(job, { nextInterviewAt: picked }, picked ? `Interview set for ${dayLabel(picked, now)}` : "Interview date cleared");
      setPicking(null);
    };
    return (
      <form
        className="flex items-center gap-2 flex-wrap"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className="text-xs text-gray-600 dark:text-gray-300" htmlFor={`date-${job.id}-${variant}`}>
          {picking === "interview" ? "When is it? (optional)" : "Interview date"}
        </label>
        <input
          id={`date-${job.id}-${variant}`}
          type="date"
          value={date}
          autoFocus
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 rounded-full px-3 min-h-8 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button type="submit" className="text-xs font-medium px-3 min-h-8 pointer-coarse:min-h-11 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors">
          Save
        </button>
        <button type="button" onClick={() => setPicking(null)} className={btn}>
          Cancel
        </button>
      </form>
    );
  }

  const snooze = () => {
    const until = new Date(now.getFullYear(), now.getMonth(), now.getDate() + SNOOZE_DAYS);
    onAct(job, { snoozedUntil: until }, `${co} hidden until ${dayLabel(until, now)}`);
  };

  const buttons: { label: string; aria: string; onClick: () => void }[] = [];
  if (action.kind === "send")
    buttons.push({
      label: "Mark applied",
      aria: `Mark ${co} as applied`,
      onClick: () => onAct(job, { stage: "applied", appliedAt: job.appliedAt ?? now }, `Marked ${co} as applied`),
    });
  if (action.kind === "follow_up") {
    const followUps = job.followUps + 1;
    buttons.push({
      label: "I followed up",
      aria: `I followed up with ${co}`,
      onClick: () =>
        onAct(
          job,
          { lastFollowUpAt: now, followUps },
          followUps >= FOLLOW_UP_NUDGES ? `Noted. That's the last reminder for ${co}` : `Noted. We'll check on ${co} in a week`
        ),
    });
    buttons.push({ label: "Got an interview", aria: `Got an interview with ${co}`, onClick: () => setPicking("interview") });
    // Chasing is optional; stopping is the honest way out for a role that went quiet.
    buttons.push({
      label: "Stop reminding me",
      aria: `Stop follow-up reminders for ${co}`,
      onClick: () => onAct(job, { followUpsOff: true }, `No more follow-up reminders for ${co}`),
    });
  }
  if (action.kind === "prep")
    buttons.push({
      label: job.nextInterviewAt ? "Change date" : "Add date",
      aria: `${job.nextInterviewAt ? "Change" : "Add"} the interview date for ${co}`,
      onClick: () => setPicking("date"),
    });
  if (action.kind !== "prep" && action.kind !== "follow_up") buttons.push({ label: "Not now", aria: `Hide ${co} for ${SNOOZE_DAYS} days`, onClick: snooze });

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {buttons.map((b) => (
        <button key={b.label} type="button" onClick={b.onClick} aria-label={b.aria} className={btn}>
          {b.label}
        </button>
      ))}
    </div>
  );
}
