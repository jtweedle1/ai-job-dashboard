// Pure: builds a one-event calendar file (.ics) for an interview day, so it can sit in the
// person's own calendar next to everything else. No accounts, no notifications from us.

function ymd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

// RFC 5545 text: escape backslashes, semicolons, commas and newlines.
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function interviewIcs(input: { uid: string; title: string; day: Date; details?: string; url?: string | null }, now = new Date()): string {
  const next = new Date(input.day.getFullYear(), input.day.getMonth(), input.day.getDate() + 1);
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wayfinder//Interview//EN",
    "BEGIN:VEVENT",
    `UID:${input.uid}@wayfinder`,
    `DTSTAMP:${stamp}`,
    // An all-day event: we only know the day, not the time.
    `DTSTART;VALUE=DATE:${ymd(input.day)}`,
    `DTEND;VALUE=DATE:${ymd(next)}`,
    `SUMMARY:${esc(input.title)}`,
    ...(input.details ? [`DESCRIPTION:${esc(input.details)}`] : []),
    ...(input.url ? [`URL:${input.url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
