// Server-only: gathers the writing a user has opted in as voice samples.
// Used by /api/voice-profile and /api/cover-letter.

import { adminDb } from "@/lib/firebase-admin";

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

// The one sample shown verbatim alongside the profile: prefer hand-written cover letters.
export function pickReferenceSample(samples: VoiceSample[]): VoiceSample | null {
  const rank = (s: VoiceSample) =>
    (s.isCoverLetter ? 2 : 0) + (s.handWritten ? 1 : 0) + (s.source === "sample" ? 0.5 : 0);
  return [...samples].sort((a, b) => rank(b) - rank(a))[0] ?? null;
}

export function truncate(text: string, maxChars: number): string {
  const t = text.trim();
  return t.length <= maxChars ? t : t.slice(0, maxChars).trimEnd() + " […]";
}
