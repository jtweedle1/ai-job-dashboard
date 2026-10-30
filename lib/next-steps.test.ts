import { describe, expect, it } from "vitest";
import { nextActions, stepsDone, suggestedStep, type JobActivity } from "./next-steps";
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
    expect(actions[0]).toMatchObject({ jobId: "s", action: "Follow up?", detail: "Applied 26 days ago and no word yet." });
  });

  it("asks for a debrief once prep exists", () => {
    const actions = nextActions([job({ stage: "interview" })], () => ({ ...NONE, preps: 1 }), NOW);
    expect(actions[0].step).toBe("debrief");
  });

  it("skips closed jobs", () => {
    expect(nextActions([job({ stage: "rejected" }), job({ stage: "withdrawn" })], () => NONE, NOW)).toEqual([]);
  });
});
