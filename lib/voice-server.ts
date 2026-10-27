// Server-only: gathers the writing a user has opted in as voice samples.
// Used by /api/voice-profile, /api/cover-letter, and /api/draft-answer.

import type Anthropic from "@anthropic-ai/sdk";
import { adminDb } from "@/lib/firebase-admin";
import { callAI } from "@/lib/ai";
import { findBannedPhrases } from "@/lib/banned-phrases";

export type VoiceSampleSource = "sample" | "cover_letter" | "answer_bank";

export interface VoiceSample {
  source: VoiceSampleSource;
  label: string;
  content: string;
  // Hand-written (or hand-edited) text is a stronger voice signal than an untouched AI draft.
  handWritten: boolean;
  isCoverLetter: boolean;
}

export async function getVoiceSamples(uid: string): Promise<VoiceSample[]> {
  const userRef = adminDb.collection("users").doc(uid);
  const [samplesSnap, lettersSnap, answersSnap] = await Promise.all([
    userRef.collection("writingSamples").where("included", "==", true).get(),
    userRef.collection("coverLetters").where("useAsVoiceSample", "==", true).get(),
    userRef.collection("answerBank").where("useAsVoiceSample", "==", true).get(),
  ]);

  const samples: VoiceSample[] = samplesSnap.docs.map((d) => ({
    source: "sample",
    label: d.get("label") ?? "Writing sample",
    content: d.get("content") ?? "",
    handWritten: true,
    isCoverLetter: d.get("kind") === "cover_letter",
  }));
  const letters: VoiceSample[] = lettersSnap.docs.map((d) => ({
    source: "cover_letter",
    label: "Past cover letter",
    content: d.get("content") ?? "",
    handWritten: d.get("edited") === true,
    isCoverLetter: true,
  }));
  const answers: VoiceSample[] = answersSnap.docs.map((d) => ({
    source: "answer_bank",
    label: d.get("question") ?? "Answer bank entry",
    content: d.get("answer") ?? "",
    handWritten: true,
    isCoverLetter: false,
  }));

  return [...samples, ...letters, ...answers].filter((s) => s.content.trim().length > 0);
}

// Hand-written cover letters are the strongest signal of how someone writes a letter.
function rank(s: VoiceSample): number {
  return (s.isCoverLetter ? 2 : 0) + (s.handWritten ? 1 : 0) + (s.source === "sample" ? 0.5 : 0);
}

export function rankSamples(samples: VoiceSample[]): VoiceSample[] {
  return [...samples].sort((a, b) => rank(b) - rank(a));
}

// The samples shown in full as examples when writing a letter.
export function pickExamples(samples: VoiceSample[], maxCount = 3): VoiceSample[] {
  return rankSamples(samples).slice(0, maxCount);
}

export function truncate(text: string, maxChars: number): string {
  const t = text.trim();
  return t.length <= maxChars ? t : t.slice(0, maxChars).trimEnd() + " […]";
}

// One rewrite pass when the draft still contains banned phrases. Returns whatever is left after it.
export async function enforceBannedPhrases(
  uid: string,
  messages: Anthropic.MessageParam[],
  system: string,
  draft: string,
  phrases: string[],
  maxTokens: number,
  model?: string
): Promise<{ content: string; remaining: string[] }> {
  const found = findBannedPhrases(draft, phrases);
  if (found.length === 0) return { content: draft, remaining: [] };

  const revision = await callAI(
    uid,
    [
      ...messages,
      { role: "assistant", content: draft },
      {
        role: "user",
        content: `This draft uses words or phrases I banned: ${found.map((f) => `"${f}"`).join(", ")}.
Rewrite only the sentences that contain them, in my voice, without using any other banned phrase. Keep everything else exactly the same. Output only the full text.`,
      },
    ],
    system,
    maxTokens,
    model
  );
  if ("error" in revision) return { content: draft, remaining: found };
  return { content: revision.content, remaining: findBannedPhrases(revision.content, phrases) };
}
