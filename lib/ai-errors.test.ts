import { describe, expect, it } from "vitest";
import { aiErrorMessage } from "./ai-errors";

describe("aiErrorMessage", () => {
  it("names our own rate limit", () => {
    expect(aiErrorMessage(429, "rate_limited", "x")).toMatch(/wait a minute/i);
  });

  it("names Anthropic's rate limit and a rejected key", () => {
    expect(aiErrorMessage(500, "429 Too Many Requests", "x")).toMatch(/wait a minute/i);
    expect(aiErrorMessage(500, '401 {"type":"error","error":{"message":"invalid x-api-key"}}', "x")).toMatch(/Settings/);
  });

  it("falls back for anything else", () => {
    expect(aiErrorMessage(500, "unexpected_response", "Scoring failed. Try again.")).toBe("Scoring failed. Try again.");
    expect(aiErrorMessage(500, undefined, "Try again.")).toBe("Try again.");
  });
});
