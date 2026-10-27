import { describe, expect, it } from "vitest";
import { buildClaimSources, claimSegments, findLoose, verifyClaims } from "./claims";
import { DEMO_BACKGROUNDS, DEMO_LETTERS, DEMO_RESUME } from "./demo-data";
import { BACKGROUND_QUESTIONS, backgroundHeading } from "@/types/background";

const letter = "At Acme I cut onboarding from 3 weeks to 5 days. I also led a team of 40 engineers.";
const sources = buildClaimSources({
  resume: "Product Manager, Acme. Cut onboarding time from 3 weeks to 5 days.",
  backgrounds: [],
  notes: "Mention I'm open to relocating.",
});

describe("buildClaimSources", () => {
  it("numbers each non-empty source", () => {
    expect(sources.map((s) => [s.id, s.label])).toEqual([
      ["S1", "Your resume"],
      ["S2", "Your notes for this letter"],
    ]);
  });
});

describe("verifyClaims", () => {
  it("keeps a claim as backed only when its evidence is in the cited source", () => {
    const claims = verifyClaims(
      letter,
      [
        { quote: "I cut onboarding from 3 weeks to 5 days", source: "S1", evidence: "from 3 weeks to 5 days" },
        { quote: "I also led a team of 40 engineers", source: "S1", evidence: "led a team of 40 engineers" },
      ],
      sources
    );
    expect(claims).toEqual([
      { quote: "I cut onboarding from 3 weeks to 5 days", source: "Your resume", evidence: "from 3 weeks to 5 days" },
      // The model invented the evidence, so the claim is shown as unbacked.
      { quote: "I also led a team of 40 engineers", source: null, evidence: null },
    ]);
  });

  it("drops quotes that aren't in the letter and duplicates", () => {
    const claims = verifyClaims(
      letter,
      [
        { quote: "I have a PhD", source: null, evidence: null },
        { quote: "I also led a team of 40 engineers", source: null, evidence: null },
        { quote: "i also led a team of 40 engineers", source: null, evidence: null },
      ],
      sources
    );
    expect(claims).toHaveLength(1);
  });

  it("treats unknown source ids and junk input as unbacked or empty", () => {
    expect(verifyClaims(letter, "not an array", sources)).toEqual([]);
    expect(
      verifyClaims(letter, [{ quote: "I also led a team of 40 engineers", source: "S9", evidence: "x" }], sources)
    ).toEqual([{ quote: "I also led a team of 40 engineers", source: null, evidence: null }]);
  });

  it("tolerates curly quotes and line breaks in a quote", () => {
    expect(findLoose("I’m based in\nChicago", "I'm based in Chicago")).toEqual({ index: 0, length: 20 });
  });
});

describe("claimSegments", () => {
  it("splits text into plain and claim runs that rebuild the original", () => {
    const claims = [{ quote: "I cut onboarding from 3 weeks to 5 days", source: "Your resume", evidence: "x" }];
    const segs = claimSegments(letter, claims);
    expect(segs.map((s) => s.text).join("")).toBe(letter);
    expect(segs.filter((s) => s.claim)).toHaveLength(1);
  });

  it("skips claims that overlap one already placed", () => {
    const claims = [
      { quote: "cut onboarding from 3 weeks", source: null, evidence: null },
      { quote: "onboarding from 3 weeks to 5 days", source: null, evidence: null },
    ];
    expect(claimSegments(letter, claims).filter((s) => s.claim)).toHaveLength(1);
  });
});

// The demo's precomputed claims must pass the same checks a real letter does.
describe("demo letters", () => {
  const demoSources = buildClaimSources({
    resume: DEMO_RESUME,
    backgrounds: DEMO_BACKGROUNDS.map((b) => ({
      heading: backgroundHeading({ ...b, startDate: "", endDate: "" }),
      answers: BACKGROUND_QUESTIONS.map((q) => ({
        label: q.label,
        text: (b.answers as Record<string, string>)[q.id] ?? "",
      })),
    })),
  });
  const idFor = (label: string | null) => demoSources.find((s) => s.label === label)?.id ?? null;

  for (const l of DEMO_LETTERS)
    it(`${l.id} claims verify against the demo material`, () => {
      const raw = l.claims.map((c) => ({ ...c, source: idFor(c.source) }));
      expect(verifyClaims(l.content, raw, demoSources)).toEqual(l.claims);
    });
});
