import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { requireAuth } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getVoiceSamples, truncate } from "@/lib/voice-server";

const PER_SAMPLE_CHARS = 4000;
const TOTAL_CHARS = 24000;

const SYSTEM = `You analyze someone's writing and describe their personal voice so another writer can imitate it.

You'll get several writing samples by the same person. Write a voice profile that a cover letter writer will follow.

Cover:
- Overall tone and formality (e.g. warm and casual, crisp and direct)
- Sentence length and rhythm
- How they open and how they sign off
- How they talk about their own work and accomplishments (modest, confident, story-driven, numbers-driven)
- Vocabulary: words and phrasings they actually use, quoted briefly
- Habits: contractions, humor, questions, exclamation points, first-person style
- Things they never do, which a writer should avoid

Rules:
- Base every point on the samples. Don't guess beyond them.
- Be concrete and specific to this person, not generic writing advice.
- Describe their voice; don't summarize their career or the content of the samples.
- Write in second person as instructions ("Open with...", "Keep sentences...").
- 150–250 words, as short bullet points under a few plain headings.

Output only the profile.`;

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { uid } = authResult;

    const { limited } = await checkRateLimit(uid);
    if (limited) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const samples = await getVoiceSamples(uid);
    if (samples.length === 0)
      return NextResponse.json({ error: "no_samples" }, { status: 400 });

    // Hand-written text first, so it survives the size cap ahead of AI drafts.
    const ordered = [...samples].sort((a, b) => Number(b.handWritten) - Number(a.handWritten));
    let budget = TOTAL_CHARS;
    const parts: string[] = [];
    for (const [i, s] of ordered.entries()) {
      if (budget <= 0) break;
      const text = truncate(s.content, Math.min(PER_SAMPLE_CHARS, budget));
      budget -= text.length;
      parts.push(`SAMPLE ${i + 1} (${s.label}):\n${text}`);
    }

    const result = await callAI(
      uid,
      [{ role: "user", content: parts.join("\n\n---\n\n") }],
      SYSTEM
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
