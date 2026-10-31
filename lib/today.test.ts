import { describe, expect, it } from "vitest";
import { comingUp, groupActions, trailStations, weekCounts, weekStart, weekSummary } from "./today";
import { nextActions, type JobActivity, type NextAction } from "./next-steps";
import type { Job } from "@/types/job";

// A Tuesday, local time.
const NOW = new Date(2026, 9, 27, 12);
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

function daysFrom(n: number, hour = 0): Date {
  return new Date(2026, 9, 27 + n, hour);
}

function action(priority: number): NextAction {
  return { jobId: `p${priority}`, title: "", company: "", action: "", detail: "", step: "decide", kind: "fit", priority };
}

describe("groupActions", () => {
  it("buckets by priority and drops empty groups", () => {
    const groups = groupActions([action(0), action(1), action(4)]);
    expect(groups.map((g) => [g.id, g.actions.length])).toEqual([["now", 2], ["later", 1]]);
  });
});

describe("trailStations", () => {
  it("places jobs on four stations and counts closed ones apart", () => {
    const { stations, closed } = trailStations([
      job({ id: "a", stage: "saved", company: "Oakline" }),
      job({ id: "b", stage: "phone_screen", company: "Fieldnote" }),
      job({ id: "c", stage: "interview", company: "Northwind" }),
      job({ id: "d", stage: "rejected" }),
      job({ id: "e", stage: "withdrawn" }),
    ]);
    expect(stations.map((s) => [s.id, s.count])).toEqual([["saved", 1], ["applied", 0], ["interviewing", 2], ["offer", 0]]);
    expect(stations[2].filter).toBe("interviewing");
    expect(closed).toBe(2);
  });

  it("caps names at two, most recent first, and swaps dots for a count when crowded", () => {
    const saved = Array.from({ length: 7 }, (_, i) =>
      job({ id: `s${i}`, company: `Co ${i}`, updatedAt: daysFrom(-i) })
    );
    const [station] = trailStations(saved).stations;
    expect(station.count).toBe(7);
    expect(station.dots).toBe(0);
    expect(station.names).toEqual(["Co 0", "Co 1"]);
    expect(station.more).toBe(5);
  });

  it("shows one dot per job on a quiet station", () => {
    const [station] = trailStations([job({ id: "a" }), job({ id: "b" })]).stations;
    expect(station.dots).toBe(2);
    expect(station.names).toEqual(["Acme"]);
    expect(station.more).toBe(0);
  });
});

describe("comingUp", () => {
  it("lists interviews from today through two weeks, soonest first", () => {
    const list = comingUp(
      [
        job({ id: "later", stage: "interview", nextInterviewAt: daysFrom(5) }),
        job({ id: "today", stage: "phone_screen", nextInterviewAt: daysFrom(0) }),
        job({ id: "past", stage: "interview", nextInterviewAt: daysFrom(-1) }),
        job({ id: "far", stage: "interview", nextInterviewAt: daysFrom(20) }),
        job({ id: "closed", stage: "rejected", nextInterviewAt: daysFrom(2) }),
      ],
      NOW
    );
    expect(list.map((i) => i.jobId)).toEqual(["today", "later"]);
    expect(list[0].kind).toBe("Phone screen");
  });
});

describe("weekSummary", () => {
  it("starts the week on Sunday", () => {
    expect(weekStart(NOW)).toEqual(new Date(2026, 9, 25));
  });

  it("counts only this week's activity", () => {
    const s = weekSummary(
      {
        jobs: [job({ appliedAt: daysFrom(-1) }), job({ appliedAt: daysFrom(-3) })],
        letterDates: [daysFrom(0, 9), daysFrom(-10)],
        interviewDates: [daysFrom(-2)],
        reviewWeeks: [daysFrom(-9)],
      },
      NOW
    );
    expect(s).toEqual({ applied: 1, letters: 1, interviews: 1, reviewed: false, reviewDue: false });
  });

  it("asks for a review from Friday until one is saved", () => {
    const friday = daysFrom(3, 12);
    const empty = { jobs: [], letterDates: [], interviewDates: [] };
    expect(weekSummary({ ...empty, reviewWeeks: [] }, friday).reviewDue).toBe(true);
    expect(weekSummary({ ...empty, reviewWeeks: [weekStart(friday)] }, friday).reviewDue).toBe(false);
  });
});

describe("nextActions with dates", () => {
  it("raises prep for an interview in two days and names the day", () => {
    const [a] = nextActions([job({ stage: "phone_screen", nextInterviewAt: daysFrom(2) })], () => NONE, NOW);
    expect(a).toMatchObject({ kind: "prep", priority: 0, action: "Prep for Thursday's phone screen", chip: { text: "Thursday" } });
  });

  it("waits until the interview has happened before asking for a debrief", () => {
    const prepped = { ...NONE, preps: 1 };
    expect(nextActions([job({ stage: "interview", nextInterviewAt: daysFrom(0) })], () => prepped, NOW)).toEqual([]);
    const [a] = nextActions([job({ stage: "interview", nextInterviewAt: daysFrom(-1) })], () => prepped, NOW);
    expect(a).toMatchObject({ kind: "debrief", action: "Note how the interview went" });
  });

  it("asks for a debrief, not prep, once a dated interview is over", () => {
    const [a] = nextActions([job({ stage: "interview", nextInterviewAt: daysFrom(-4) })], () => NONE, NOW);
    expect(a).toMatchObject({ kind: "debrief", priority: 1, chip: { overdue: true } });
  });

  it("hides a snoozed job until the snooze ends", () => {
    const j = job({ snoozedUntil: daysFrom(3) });
    expect(nextActions([j], () => NONE, NOW)).toEqual([]);
    expect(nextActions([j], () => NONE, daysFrom(4))).toHaveLength(1);
  });

  it("restarts the follow-up clock after you follow up", () => {
    const applied = daysFrom(-20);
    expect(nextActions([job({ stage: "applied", appliedAt: applied, lastFollowUpAt: daysFrom(-3) })], () => NONE, NOW)).toEqual([]);
    const [a] = nextActions([job({ stage: "applied", appliedAt: applied, lastFollowUpAt: daysFrom(-8) })], () => NONE, NOW);
    expect(a).toMatchObject({ kind: "follow_up", action: "Follow up again?", chip: { text: "20 days" } });
  });
});

describe("weekCounts", () => {
  const weekOf = weekStart(NOW);

  it("counts this week's applications and interviews from the tracker", () => {
    const jobs = [
      job({ id: "a", appliedAt: daysFrom(-1) }),
      job({ id: "b", appliedAt: daysFrom(-9) }),
      job({ id: "c", stage: "interview", nextInterviewAt: daysFrom(1) }),
      job({ id: "d", stage: "interview", nextInterviewAt: daysFrom(14) }),
    ];
    expect(weekCounts({ jobs, debriefs: [] }, weekOf)).toEqual({ applicationsSent: 1, interviewsBooked: 1 });
  });

  it("counts a debriefed interview once, even when the job still has its date", () => {
    const jobs = [job({ id: "c", stage: "interview", nextInterviewAt: daysFrom(-1) })];
    const debriefs = [
      { jobId: "c", interviewDate: daysFrom(-1, 15) },
      { jobId: "e", interviewDate: daysFrom(-2) },
    ];
    expect(weekCounts({ jobs, debriefs }, weekOf).interviewsBooked).toBe(2);
  });
});
