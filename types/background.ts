// A detailed write-up of one past position, used as true material for cover letters.
export interface BackgroundQuestion {
  id: string;
  label: string;
  hint: string;
}

// Every question is optional; answers can be bullets or paragraphs.
export const BACKGROUND_QUESTIONS: BackgroundQuestion[] = [
  {
    id: "role",
    label: "What did you own day to day?",
    hint: "Your main responsibilities, what you were accountable for, what a typical week looked like.",
  },
  {
    id: "team",
    label: "What was the team like, and who did you work with?",
    hint: "Team size, who you reported to, cross-functional partners, people you mentored or led.",
  },
  {
    id: "accomplishments",
    label: "What are you proudest of?",
    hint: "Wins, launches, results. Include numbers where you have them (time saved, revenue, users, %).",
  },
  {
    id: "challenge",
    label: "Tell a hard problem you solved.",
    hint: "What was going wrong, what you did, and how it turned out.",
  },
  {
    id: "stories",
    label: "Any stories that show who you are?",
    hint: "Moments with a customer, teammate, or project that say something about how you work or what you care about.",
  },
  {
    id: "skills",
    label: "Skills, tools, and methods you used",
    hint: "Software, languages, frameworks, processes, certifications.",
  },
  {
    id: "other",
    label: "Anything else worth knowing?",
    hint: "Why you joined or left, what you learned, context a hiring manager should hear.",
  },
];

export interface Background {
  id: string;
  title: string;
  company: string;
  // Free text so users can write "Jan 2022", "2022", or "Present".
  startDate: string;
  endDate: string;
  // Keyed by BackgroundQuestion.id.
  answers: Record<string, string>;
  // Whether this position is used when generating cover letters. Remembered between letters.
  included: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toBackgroundAnswers(d: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (d && typeof d === "object") {
    for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
  }
  return out;
}

export function backgroundHeading(b: Pick<Background, "title" | "company" | "startDate" | "endDate">): string {
  const dates = [b.startDate.trim(), b.endDate.trim()].filter(Boolean).join(" – ");
  const head = [b.title.trim(), b.company.trim()].filter(Boolean).join(" at ") || "Untitled position";
  return dates ? `${head} (${dates})` : head;
}

export function hasBackgroundContent(answers: Record<string, string>): boolean {
  return Object.values(answers).some((v) => v.trim().length > 0);
}
