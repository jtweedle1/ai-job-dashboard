import { describe, expect, it } from "vitest";
import { buildStoryItems, searchStories } from "./stories";
import type { Background } from "@/types/background";
import type { AnswerEntry } from "@/types/answerBank";
import type { Debrief } from "@/types/debrief";

const day = (n: number) => new Date(2026, 0, n);

const backgrounds: Background[] = [
  {
    id: "b1",
    title: "Designer",
    company: "Acme",
    startDate: "",
    endDate: "",
    answers: { accomplishments: "Rebuilt onboarding.", challenge: "  " },
    included: true,
    createdAt: day(1),
    updatedAt: day(1),
  },
];
const answers: AnswerEntry[] = [
  {
    id: "a1",
    question: "Why us?",
    answer: "",
    tags: ["motivation"],
    jobId: "j1",
    useAsVoiceSample: false,
    createdAt: day(3),
    updatedAt: day(3),
  },
];
const debriefs: Debrief[] = [
  {
    id: "d1",
    jobId: "j1",
    interviewDate: day(2),
    whatTheyAsked: "Onboarding metrics",
    wentWell: "",
    feltWeird: "",
    followUpOpportunities: "",
    answersToImprove: "",
    createdAt: day(2),
  },
];

const items = buildStoryItems(backgrounds, answers, debriefs, (id) => (id === "j1" ? "Designer at Beta" : null));

describe("buildStoryItems", () => {
  it("makes one item per answered question or note, newest first", () => {
    expect(items.map((i) => i.id)).toEqual(["ans-a1", "deb-d1-whatTheyAsked", "bg-b1-accomplishments"]);
    expect(items[0].context).toBe("Designer at Beta · motivation");
  });
});

describe("searchStories", () => {
  it("matches every word across title, context, and text", () => {
    expect(searchStories(items, "onboarding", null)).toHaveLength(2);
    expect(searchStories(items, "onboarding metrics", null).map((i) => i.kind)).toEqual(["interview"]);
  });

  it("filters by kind", () => {
    expect(searchStories(items, "", "experience").map((i) => i.id)).toEqual(["bg-b1-accomplishments"]);
  });
});
