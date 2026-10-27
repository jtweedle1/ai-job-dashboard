// Pure: flattens the three kinds of story into one searchable list. No Firebase, safe on client and server.

import { BACKGROUND_QUESTIONS, backgroundHeading } from "@/types/background";
import { DEBRIEF_FIELDS } from "@/types/debrief";
import type { Background } from "@/types/background";
import type { AnswerEntry } from "@/types/answerBank";
import type { Debrief } from "@/types/debrief";

export type StoryKind = "experience" | "answer" | "interview";

export interface StoryItem {
  id: string;
  kind: StoryKind;
  title: string;
  context: string;
  text: string;
  href: string;
  date: Date;
}

export const STORY_KIND_META: Record<StoryKind, { label: string; icon: string }> = {
  experience: { label: "Experience", icon: "ti-briefcase" },
  answer: { label: "Answers", icon: "ti-bookmarks" },
  interview: { label: "Interview notes", icon: "ti-clipboard-list" },
};

function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function buildStoryItems(
  backgrounds: Background[],
  answers: AnswerEntry[],
  debriefs: Debrief[],
  jobTitle: (jobId: string | null) => string | null
): StoryItem[] {
  const items: StoryItem[] = [];

  for (const b of backgrounds)
    for (const q of BACKGROUND_QUESTIONS) {
      const text = (b.answers[q.id] ?? "").trim();
      if (text)
        items.push({
          id: `bg-${b.id}-${q.id}`,
          kind: "experience",
          title: q.label,
          context: backgroundHeading(b),
          text,
          href: "/background",
          date: b.updatedAt,
        });
    }

  for (const a of answers)
    items.push({
      id: `ans-${a.id}`,
      kind: "answer",
      title: a.question,
      context: [jobTitle(a.jobId), ...a.tags].filter(Boolean).join(" · "),
      text: a.answer.trim(),
      href: "/answer-bank",
      date: a.updatedAt,
    });

  for (const d of debriefs)
    for (const f of DEBRIEF_FIELDS) {
      const text = d[f.key].trim();
      if (text)
        items.push({
          id: `deb-${d.id}-${f.key}`,
          kind: "interview",
          title: f.label,
          context: `${jobTitle(d.jobId) ?? "Interview"} · ${shortDate(d.interviewDate)}`,
          text,
          href: "/debrief",
          date: d.interviewDate,
        });
    }

  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function searchStories(items: StoryItem[], query: string, kind: StoryKind | null): StoryItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((i) => {
    if (kind && i.kind !== kind) return false;
    const hay = `${i.title} ${i.context} ${i.text}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
