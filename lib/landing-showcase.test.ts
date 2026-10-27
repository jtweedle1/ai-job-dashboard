import { describe, expect, it } from "vitest";
import {
  GENERIC_FLAGS,
  JOURNEY,
  LETTER_CHECKS,
  STORY,
  VOICE_CLAIMS,
  VOICE_EXCERPT,
  VOICE_FLAGS,
  VOICE_STATS,
  splitOnPhrases,
} from "./landing-showcase";

describe("landing showcase", () => {
  it("catches the generic example and passes Riley's letter", () => {
    expect(GENERIC_FLAGS.length).toBeGreaterThanOrEqual(5);
    expect(VOICE_FLAGS).toEqual([]);
  });

  it("shows real traced claims and a story that appears in the letter", () => {
    expect(VOICE_CLAIMS.length).toBeGreaterThan(3);
    expect(VOICE_EXCERPT).toContain(STORY.letterLine);
  });

  it("measures the demo writing sample and fills the journey", () => {
    expect(VOICE_STATS.sampleCount).toBe(1);
    expect(VOICE_STATS.signOffs).toEqual(["Thanks,"]);
    expect(LETTER_CHECKS.every((c) => c.ok)).toBe(true);
    expect(JOURNEY.every((s) => s.detail.length > 20)).toBe(true);
  });

  it("splits text around phrases, longest first", () => {
    const parts = splitOnPhrases("I am Passionate about leveraging it.", ["passionate", "passionate about leveraging"]);
    expect(parts).toEqual([
      { text: "I am ", hit: false },
      { text: "Passionate about leveraging", hit: true },
      { text: " it.", hit: false },
    ]);
  });
});
