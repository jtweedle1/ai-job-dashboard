import { describe, expect, it } from "vitest";
import { countWords, letterQualityChecks } from "./letter-quality";

const good = `Hi team,

Last spring I watched a coordinator re-type the same form three times. That stuck with me. Since then my work has been about removing steps like that. Your scheduling product does exactly this.

Thanks,
Riley`;

function byId(content: string, opts: Partial<Parameters<typeof letterQualityChecks>[1]> = {}) {
  const checks = letterQualityChecks(content, { bannedPhrases: [], targetWords: null, claims: null, ...opts });
  return Object.fromEntries(checks.map((c) => [c.id, c]));
}

describe("letterQualityChecks", () => {
  it("passes a clean letter", () => {
    const checks = byId(good);
    expect(Object.values(checks).every((c) => c.ok)).toBe(true);
    expect(checks.claims).toBeUndefined();
  });

  it("flags banned words, AI cliches, and placeholders", () => {
    const checks = byId(`${good}\nI am excited to apply. I spent [TIME] at Acme, a synergy machine.`, {
      bannedPhrases: ["synergy"],
    });
    expect(checks.banned.ok).toBe(false);
    expect(checks.cliches.ok).toBe(false);
    expect(checks.placeholders.detail).toContain("[TIME]");
  });

  it("checks length against the target with some room", () => {
    const words = countWords(good);
    expect(byId(good, { targetWords: Math.round(words * 1.1) }).length.ok).toBe(true);
    expect(byId(good, { targetWords: words * 2 }).length.ok).toBe(false);
  });

  it("flags letters where most sentences start with I", () => {
    const text = "I like design. I build systems. I run research. I ship things. My team likes it.";
    expect(byId(text).openings.ok).toBe(false);
  });

  it("reports unbacked claims once sources are checked", () => {
    const claims = [
      { quote: "a", source: "Your resume", evidence: "a" },
      { quote: "b", source: null, evidence: null },
    ];
    const check = byId(good, { claims }).claims;
    expect(check.ok).toBe(false);
    expect(check.detail).toBe("1 of 2 not found in your resume or background");
  });
});
