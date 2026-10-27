import { describe, expect, it } from "vitest";
import { computeVoiceStats, describeVoiceStats } from "./voice-stats";

const letter = `Hi Harbor team,

I've spent four years designing for clinics. It's the work I'd pick again. Patients don't read instructions, so I design for that.

Thanks,
Riley`;

describe("computeVoiceStats", () => {
  it("measures contractions, greetings, and sign-offs from the samples", () => {
    const stats = computeVoiceStats([letter]);
    expect(stats.sampleCount).toBe(1);
    expect(stats.contractionsPer100Words).toBeGreaterThan(5);
    expect(stats.greetings).toEqual(["Hi Harbor team,"]);
    expect(stats.signOffs).toEqual(["Thanks,"]);
    expect(stats.medianParagraphs).toBe(1);
  });

  it("returns zeros, not NaN, for no samples", () => {
    const stats = computeVoiceStats(["", "  "]);
    expect(stats.sampleCount).toBe(0);
    expect(stats.medianWords).toBe(0);
    expect(stats.avgSentenceWords).toBe(0);
    expect(stats.contractionsPer100Words).toBe(0);
  });
});

describe("describeVoiceStats", () => {
  it("tells the model the writer uses contractions when they do", () => {
    expect(describeVoiceStats(computeVoiceStats([letter]))).toContain("uses contractions");
  });
});
