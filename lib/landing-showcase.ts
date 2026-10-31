// Pure: what the landing page shows, all derived from the demo search so it matches what visitors see
// inside. No Firebase, safe on client and server.

import { buildDemoDocs, DEMO_BACKGROUNDS, DEMO_LETTERS, DEMO_VOICE_SETTINGS } from "@/lib/demo-data";
import { findBannedPhrases, parseBannedPhrases } from "@/lib/banned-phrases";
import { AI_CLICHES, letterQualityChecks } from "@/lib/letter-quality";
import { computeVoiceStats } from "@/lib/voice-stats";

// Only text is read from the docs, so the date doesn't matter; a fixed one keeps server and client equal.
const docs = buildDemoDocs(new Date(0));
const docData = (collection: string, id?: string) =>
  docs.find((d) => d.collection === collection && (id === undefined || d.id === id))?.data ?? {};

const letter = DEMO_LETTERS[0];
const letterParagraphs = letter.content.split("\n\n");

export const SHOWCASE_JOB = { title: "Senior Product Designer", company: "Northwind Care" };

// An example of the letter a generic AI tool writes for the same job. Labeled as an example on the page.
export const GENERIC_EXCERPT = `I am writing to express my interest in the Senior Product Designer position at Northwind Care. I am thrilled by the opportunity to join a dynamic team in a fast-paced environment.

I am passionate about leveraging user-centered design to drive impactful outcomes. I believe my skills align perfectly with your needs, and I am confident that I would be a valuable asset to your organization.`;

// The opening of Riley's real demo letter for the same job, with its traced claims.
export const VOICE_EXCERPT = letterParagraphs.slice(1, 3).join("\n\n");
export const VOICE_CLAIMS = letter.claims.filter((c) => VOICE_EXCERPT.includes(c.quote));

export const BANNED_PHRASES = parseBannedPhrases(DEMO_VOICE_SETTINGS.neverSay);
const flagList = [...BANNED_PHRASES, ...AI_CLICHES];

// The same checks Wayfinder runs on every letter, run here on both excerpts.
export const GENERIC_FLAGS = findBannedPhrases(GENERIC_EXCERPT, flagList);
export const VOICE_FLAGS = findBannedPhrases(VOICE_EXCERPT, flagList);

const openings = (text: string) =>
  letterQualityChecks(text, { bannedPhrases: [], targetWords: null, claims: null }).find((c) => c.id === "openings")!;
export const GENERIC_OPENINGS = openings(GENERIC_EXCERPT);
export const VOICE_OPENINGS = openings(VOICE_EXCERPT);

export const VOICE_STATS = computeVoiceStats([String(docData("writingSamples").content ?? "")]);

// One story, and the letter line it became.
const brightpath = DEMO_BACKGROUNDS[0];
export const STORY = {
  source: `${brightpath.title} at ${brightpath.company}`,
  question: "Tell a hard problem you solved.",
  text: brightpath.answers.challenge,
  letterLine: "When older patients kept abandoning the insurance step, I sat in on clinic sessions, watched people hunt for their member ID, and added a photo-of-your-card option.",
};

// A claim from the other demo letter that isn't in Riley's notes.
export const UNTRACED_CLAIM = DEMO_LETTERS[1].claims.find((c) => !c.source)!;

// The "Before you send" panel for the full demo letter.
export const LETTER_CHECKS = letterQualityChecks(letter.content, {
  bannedPhrases: BANNED_PHRASES,
  targetWords: null,
  claims: letter.claims,
}).filter((c) => c.id !== "length");

const prep = docData("interviewPreps", "demo-prep-northwind");
const debrief = docData("debriefs", "demo-debrief-northwind");

// Everything attached to the one demo job, in the order it happened.
export const JOURNEY = [
  { label: "Fit score", detail: "86 out of 100. Strong match, with a note on the senior gap." },
  { label: "Cover letter", detail: `Opens with: "${letterParagraphs[1].split(".")[0]}."` },
  {
    label: "Interview prep",
    detail: `${(prep.mockQuestions as string[] | undefined)?.length ?? 0} questions for this role, like "${
      (prep.mockQuestions as string[] | undefined)?.[0] ?? ""
    }"`,
  },
  { label: "Interview notes", detail: String(debrief.wentWell ?? "") },
];

// Wraps every occurrence of the given phrases, case-insensitively, so the page can highlight them.
export function splitOnPhrases(text: string, phrases: string[]): { text: string; hit: boolean }[] {
  if (phrases.length === 0) return [{ text, hit: false }];
  const pattern = phrases
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"))
    .sort((a, b) => b.length - a.length)
    .join("|");
  return text
    .split(new RegExp(`(${pattern})`, "gi"))
    .filter(Boolean)
    .map((part) => ({ text: part, hit: phrases.some((p) => p.toLowerCase() === part.toLowerCase().replace(/\s+/g, " ")) }));
}
