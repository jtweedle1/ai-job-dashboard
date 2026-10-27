import { NextResponse } from "next/server";
import { callAI, WRITING_MODEL } from "@/lib/ai";
import { requireAuth } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { adminDb } from "@/lib/firebase-admin";
import { getVoiceSamples, rankSamples, truncate } from "@/lib/voice-server";
import { toVoiceSettings } from "@/types/writingSample";
import { computeVoiceStats, describeVoiceStats } from "@/lib/voice-stats";

const PER_SAMPLE_CHARS = 6000;
const TOTAL_CHARS = 30000;

const SYSTEM = `You study one person's writing and describe their voice so another writer can sound exactly like them.

You get MEASUREMENTS computed from the samples, then the SAMPLES themselves.

Write a voice profile with these headings:
## Tone
## Structure (how their letters move from opening to close, paragraph by paragraph)
## Sentences and rhythm
## Openings and sign-offs
## How they talk about their work
## Signature moves (memorable lines, value statements, little stories or asides that give the writing personality)
## Phrases they actually use (quote 5–10 short phrases verbatim)
## Avoid (only things that would clearly sound unlike them)

Rules:
- The MEASUREMENTS are facts. Never contradict them (if they use contractions, never say "no contractions").
- Every point must be visible in the samples. Never write an "avoid" rule that any sample breaks.
- Personality matters most. Point out what makes this person sound like themselves rather than like a generic professional, and tell the writer to keep it.
- Be specific to this person. No generic writing advice.
- Describe how they write, not their career history.
- Write as direct instructions ("Open with...", "Close with...").
- If the candidate gave WRITING RULES, never quote or recommend anything they ban, even if it appears in a sample. Mention in "Avoid" that their rules list applies.
- Keep it under 350 words.

Output only the profile.`;

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { uid } = authResult;

    const { limited } = await checkRateLimit(uid);
    if (limited) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const [samples, userSnap] = await Promise.all([
      getVoiceSamples(uid),
      adminDb.collection("users").doc(uid).get(),
    ]);
    const rules = toVoiceSettings(userSnap.get("voiceSettings")).neverSay.trim();
    if (samples.length === 0)
      return NextResponse.json({ error: "no_samples" }, { status: 400 });

    // Strongest samples first, so they survive the size cap ahead of AI drafts.
    const ordered = rankSamples(samples);
    let budget = TOTAL_CHARS;
    const parts: string[] = [];
    for (const [i, s] of ordered.entries()) {
      if (budget <= 0) break;
      const text = truncate(s.content, Math.min(PER_SAMPLE_CHARS, budget));
      budget -= text.length;
      parts.push(`SAMPLE ${i + 1} (${s.isCoverLetter ? "cover letter" : "other writing"}):\n${text}`);
    }

    // Measure cover letters when there are any; they set the length and shape a letter should take.
    const letters = samples.filter((s) => s.isCoverLetter);
    const stats = computeVoiceStats((letters.length ? letters : samples).map((s) => s.content));

    let userMessage = `MEASUREMENTS:\n${describeVoiceStats(stats)}\n\nSAMPLES:\n\n${parts.join("\n\n---\n\n")}`;
    if (rules) userMessage += `\n\nWRITING RULES FROM THE CANDIDATE:\n"""\n${truncate(rules, 12000)}\n"""`;

    const result = await callAI(
      uid,
      [{ role: "user", content: userMessage }],
      SYSTEM,
      1500,
      WRITING_MODEL
    );

    if ("error" in result)
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "no_key" ? 401 : 500 }
      );

    // The client saves the profile, so the user can review or edit it first.
    return NextResponse.json({ content: result.content.trim(), sampleCount: parts.length });
  } catch (err) {
    console.error("[voice-profile] Error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
