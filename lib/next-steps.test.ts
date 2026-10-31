import { describe, expect, it } from "vitest";
import { nextActions, stepsDone, suggestedStep, timeAgo, type JobActivity } from "./next-steps";
import { fitWord } from "@/types/job";
import type { Job } from "@/types/job";

const NOW = new Date("2026-10-27T12:00:00Z");
const NONE: JobActivity = { letters: 0, preps: 0, debriefs: 0 };

function job(over: Partial<Job>): Job {
  return {
    id: "j1",
    title: "Designer",
    company: "Acme",
    location: null,
    salary: null,
    url: null,
    description: "",
    source: "linkedin",
    stage: "saved",
    fitScore: null,
    fitReasoning: null,
    resumeIdUsed: null,
    notes: null,
    appliedAt: null,
    nextInterviewAt: null,
    lastFollowUpAt: null,
    snoozedUntil: null,
    followUps: 0,
    followUpsOff: false,
    applyBy: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

describe("suggestedStep", () => {
  it("starts a fresh job on Decide", () => {
    expect(suggestedStep(job({}), NONE)).toBe("decide");
  });

  it("moves to Apply once the fit is scored", () => {
    expect(suggestedStep(job({ fitScore: 82 }), NONE)).toBe("apply");
  });

  it("opens interviewing jobs on Interview until there's a debrief", () => {
    expect(suggestedStep(job({ stage: "interview" }), NONE)).toBe("interview");
    expect(suggestedStep(job({ stage: "interview" }), { ...NONE, preps: 1, debriefs: 1 })).toBe("debrief");
  });

  it("opens finished jobs on Outcome", () => {
    expect(suggestedStep(job({ stage: "rejected" }), NONE)).toBe("outcome");
  });
});

describe("stepsDone", () => {
  it("counts Decide and Apply as done once applied", () => {
    const done = stepsDone(job({ stage: "applied" }), NONE);
    expect(done.decide).toBe(true);
    expect(done.apply).toBe(true);
    expect(done.interview).toBe(false);
  });
});

describe("nextActions", () => {
  it("puts interview prep before writing letters", () => {
    const jobs = [job({ id: "a", fitScore: 70 }), job({ id: "b", stage: "phone_screen" })];
    const actions = nextActions(jobs, () => NONE, NOW);
    expect(actions.map((a) => a.jobId)).toEqual(["b", "a"]);
    expect(actions[0].action).toBe("Prep for the phone screen");
    expect(actions[0].step).toBe("interview");
  });

  it("nudges a follow-up only after two weeks of silence", () => {
    const recent = job({ id: "r", stage: "applied", appliedAt: new Date("2026-10-20T12:00:00Z") });
    const stale = job({ id: "s", stage: "applied", appliedAt: new Date("2026-10-01T12:00:00Z") });
    const actions = nextActions([recent, stale], () => NONE, NOW);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ jobId: "s", action: "Follow up?", detail: "Applied 26 days ago and no word yet. Optional: many teams never reply." });
  });

  it("stops suggesting follow-ups after two chases, or when asked to", () => {
    const appliedAt = new Date("2026-10-01T12:00:00Z");
    const lastFollowUpAt = new Date("2026-10-10T12:00:00Z");
    expect(nextActions([job({ stage: "applied", appliedAt, lastFollowUpAt, followUps: 1 })], () => NONE, NOW)).toHaveLength(1);
    expect(nextActions([job({ stage: "applied", appliedAt, lastFollowUpAt, followUps: 2 })], () => NONE, NOW)).toEqual([]);
    expect(nextActions([job({ stage: "applied", appliedAt, followUpsOff: true })], () => NONE, NOW)).toEqual([]);
  });

  it("never marks a follow-up as overdue", () => {
    const [a] = nextActions([job({ stage: "applied", appliedAt: new Date("2026-09-01T12:00:00Z") })], () => NONE, NOW);
    expect(a.chip?.overdue).toBeUndefined();
  });

  it("shows a saved role's apply-by day and raises it when it's close", () => {
    const soon = job({ id: "soon", applyBy: new Date(2026, 9, 28) });
    const later = job({ id: "later", applyBy: new Date(2026, 10, 2) });
    const far = job({ id: "far", applyBy: new Date(2026, 11, 1) });
    const passed = job({ id: "passed", applyBy: new Date(2026, 9, 20) });
    const byId = Object.fromEntries(nextActions([soon, later, far, passed], () => NONE, NOW).map((a) => [a.jobId, a]));
    expect(byId.soon).toMatchObject({ priority: 1, chip: { text: "Apply by tomorrow" } });
    expect(byId.later).toMatchObject({ priority: 4, chip: { text: "Apply by Monday" } });
    expect(byId.far.chip).toBeUndefined();
    expect(byId.passed.chip).toEqual({ text: "Deadline passed" });
  });

  it("asks for a debrief once prep exists", () => {
    const actions = nextActions([job({ stage: "interview" })], () => ({ ...NONE, preps: 1 }), NOW);
    expect(actions[0].step).toBe("debrief");
  });

  it("skips closed jobs", () => {
    expect(nextActions([job({ stage: "rejected" }), job({ stage: "withdrawn" })], () => NONE, NOW)).toEqual([]);
  });
});

describe("timeAgo", () => {
  const now = new Date(2026, 9, 31, 15);
  it("says today, yesterday and days ago within the week", () => {
    expect(timeAgo(new Date(2026, 9, 31, 1), now)).toBe("Today");
    expect(timeAgo(new Date(2026, 9, 30, 23), now)).toBe("Yesterday");
    expect(timeAgo(new Date(2026, 9, 28), now)).toBe("3 days ago");
  });
  it("falls back to a date, with the year only when it differs", () => {
    expect(timeAgo(new Date(2026, 9, 20), now)).toBe("Oct 20");
    expect(timeAgo(new Date(2025, 11, 2), now)).toBe("Dec 2, 2025");
  });
  it("treats a future date as today", () => {
    expect(timeAgo(new Date(2026, 10, 2), now)).toBe("Today");
  });
});

describe("fitWord", () => {
  it("uses the design thresholds", () => {
    expect(fitWord(86).word).toBe("Strong");
    expect(fitWord(75).word).toBe("Strong");
    expect(fitWord(74).word).toBe("Possible");
    expect(fitWord(55).word).toBe("Possible");
    expect(fitWord(54).word).toBe("Long shot");
  });
});
