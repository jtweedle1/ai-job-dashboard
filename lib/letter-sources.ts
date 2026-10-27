// Server-only: traces a letter's claims back to the candidate's resume and background.
// Used by /api/cover-letter (right after drafting) and /api/letter-claims (on demand, e.g. after an edit).

import { adminDb } from "@/lib/firebase-admin";
import { callAI } from "@/lib/ai";
import { truncate } from "@/lib/voice-server";
import { buildClaimSources, verifyClaims, type ClaimSource } from "@/lib/claims";
import { toVoiceSettings } from "@/types/writingSample";
import { BACKGROUND_QUESTIONS, backgroundHeading, toBackgroundAnswers } from "@/types/background";
import type { LetterClaim } from "@/types/coverLetter";

const SOURCE_CHARS = 8000;
const MAX_BACKGROUNDS = 20;

const SYSTEM = `You fact-check a cover letter against the candidate's own material.

List every factual claim the LETTER makes about the candidate: roles, employers, skills, tools, results, numbers, stories, credentials. Skip opinions, enthusiasm, and anything about the company or the job.

For each claim, find the SOURCE that says the same thing. A claim is supported only if a source actually states it. A number, tool, employer, or result that no source mentions is unsupported, even if it sounds plausible.

Return ONLY a JSON array, no markdown, no explanation. Each item:
{"quote": "<the claim, copied exactly from the letter, one clause, under 25 words>", "source": "<source id like S2, or null>", "evidence": "<the supporting words copied exactly from that source, under 25 words, or null>"}`;

// Every background is fair game here, not just the ones picked for the letter: they're all true.
export async function loadClaimSources(uid: string, resume: string, notes: string): Promise<ClaimSource[]> {
  const userRef = adminDb.collection("users").doc(uid);
  const [userSnap, bgSnap] = await Promise.all([
    userRef.get(),
    userRef.collection("backgrounds").limit(MAX_BACKGROUNDS).get(),
  ]);
  const backgrounds = bgSnap.docs.map((d) => {
    const answers = toBackgroundAnswers(d.get("answers"));
    return {
      heading: backgroundHeading({
        title: d.get("title") ?? "",
        company: d.get("company") ?? "",
        startDate: "",
        endDate: "",
      }),
      answers: BACKGROUND_QUESTIONS.map((q) => ({ label: q.label, text: answers[q.id] ?? "" })),
    };
  });
  return buildClaimSources({
    resume,
    backgrounds,
    alwaysMention: toVoiceSettings(userSnap.get("voiceSettings")).alwaysMention,
    notes,
  });
}

export async function checkClaims(
  uid: string,
  letter: string,
  sources: ClaimSource[]
): Promise<{ claims: LetterClaim[] } | { error: string }> {
  const sourceText = sources
    .map((s) => `[${s.id}] ${s.label}\n"""\n${truncate(s.text, SOURCE_CHARS)}\n"""`)
    .join("\n\n");
  const message = `SOURCES\n\n${sourceText || "(none)"}\n\n---\n\nLETTER\n"""\n${letter}\n"""`;

  const result = await callAI(uid, [{ role: "user", content: message }], SYSTEM, 2048);
  if ("error" in result) return result;
  try {
    const raw = result.content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    return { claims: verifyClaims(letter, JSON.parse(raw), sources) };
  } catch {
    console.error("[letter-sources] JSON parse failed:", result.content);
    return { error: "parse_failed" };
  }
}
