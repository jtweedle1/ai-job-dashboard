import { describe, expect, it } from "vitest";
import { findBannedPhrases, parseBannedPhrases } from "./banned-phrases";

describe("parseBannedPhrases", () => {
  it("reads comma lists and one phrase per line", () => {
    expect(parseBannedPhrases("leverage, synergy\nthrilled")).toEqual(["leverage", "synergy", "thrilled"]);
  });

  it("skips headings and bullet rules, which are guidance for the model", () => {
    const text = "Overused words:\nrobust, delve\n* Never open with a question\n- Keep it short";
    expect(parseBannedPhrases(text)).toEqual(["robust", "delve"]);
  });

  it("reads 'Never use: ...' lists but not other labelled lines", () => {
    expect(parseBannedPhrases("Never use: tapestry, realm\nOverall style: specific, concise")).toEqual([
      "tapestry",
      "realm",
    ]);
  });

  it("strips quotes and trailing punctuation", () => {
    expect(parseBannedPhrases(`"I am excited to apply."`)).toEqual(["I am excited to apply"]);
  });

  it("treats long sentences as guidance, not phrases", () => {
    expect(parseBannedPhrases("Write like you are talking to a friend over coffee about your work")).toEqual([]);
  });
});

describe("findBannedPhrases", () => {
  it("matches whole words only", () => {
    expect(findBannedPhrases("Our robustness tests passed.", ["robust"])).toEqual([]);
    expect(findBannedPhrases("A robust plan.", ["robust"])).toEqual(["robust"]);
  });

  it("ignores case, curly apostrophes, and line breaks inside a phrase", () => {
    expect(findBannedPhrases("I’m EXCITED to\napply", ["I'm excited to apply"])).toEqual(["I'm excited to apply"]);
  });
});
