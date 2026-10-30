import { describe, expect, it } from "vitest";
import { interviewIcs } from "./calendar";

describe("interviewIcs", () => {
  it("makes an all-day event on the interview day", () => {
    const ics = interviewIcs(
      { uid: "job1-20261112", title: "Interview: Acme, Designer", day: new Date(2026, 10, 12), details: "Prep, then breathe;\nyou've got this" },
      new Date("2026-10-30T12:00:00Z")
    );
    expect(ics).toContain("DTSTART;VALUE=DATE:20261112\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20261113\r\n");
    expect(ics).toContain("SUMMARY:Interview: Acme\\, Designer\r\n");
    expect(ics).toContain("DESCRIPTION:Prep\\, then breathe\;\\nyou've got this\r\n");
    expect(ics).toContain("DTSTAMP:20261030T120000Z\r\n");
  });

  it("rolls the end over a month boundary", () => {
    expect(interviewIcs({ uid: "x", title: "t", day: new Date(2026, 9, 31) })).toContain("DTEND;VALUE=DATE:20261101");
  });
});
