import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { adminDb } from "@/lib/firebase-admin";
import { callAI, WRITING_MODEL } from "@/lib/ai";
import { requireAuth } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { enforceBannedPhrases, truncate } from "@/lib/voice-server";
import { parseBannedPhrases } from "@/lib/banned-phrases";
import { toVoiceSettings } from "@/types/writingSample";
import { BACKGROUND_QUESTIONS, backgroundHeading, toBackgroundAnswers } from "@/types/background";

const MAX_QUESTION_CHARS = 1000;
const MAX_BACKGROUNDS = 20;
const BACKGROUND_CHARS = 6000;
const MAX_BACKGROUND_TOTAL_CHARS = 30000;
const COMPANY_FIELDS = ["whatTheyDo", "productSummary", "values", "recentNews", "whyInterested"] as const;

const SYSTEM = `You help one candidate prepare a written or spoken answer to an application or interview question, using only their own stories.

Rules:
- Pick the ONE story from the candidate's STORIES that best answers the question, and tell it concretely: the situation, what they did, and how it turned out. For behavioral questions, that's the STAR shape, but don't label the parts.
- For "why this company" or "why this role" questions, connect something specific about the company (from COMPANY or the JOB) to something true about the candidate.
- Only state facts about the candidate that appear in STORIES. Never invent numbers, tools, titles, or results. If the stories don't cover the question, write the best honest answer you can and keep it short.
- Write in first person, the way the candidate talks. Follow their VOICE PROFILE and GUIDELINES if given.
- 120 to 220 words. Plain paragraphs, no headings or bullet points.

Output only the answer.`;

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { uid } = authResult;

    const { limited } = await checkRateLimit(uid);
    if (limited) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const { question, jobId } = await request.json();
    if (typeof question !== "string" || !question.trim())
      return NextResponse.json({ error: "missing fields" }, { status: 400 });

    const userRef = adminDb.collection("users").doc(uid);
    const validJobId = typeof jobId === "string" && jobId ? jobId : null;
    const [userSnap, bgSnap, jobSnap, companySnap] = await Promise.all([
      userRef.get(),
      userRef.collection("backgrounds").limit(MAX_BACKGROUNDS).get(),
      validJobId ? userRef.collection("jobs").doc(validJobId).get() : null,
      validJobId ? userRef.collection("companies").where("jobId", "==", validJobId).limit(1).get() : null,
    ]);

    const blocks: string[] = [];
    let total = 0;
    for (const d of bgSnap.docs) {
      const answers = toBackgroundAnswers(d.get("answers"));
      const parts = BACKGROUND_QUESTIONS.filter((q) => answers[q.id]?.trim()).map(
        (q) => `${q.label}\n${answers[q.id].trim()}`
      );
      if (parts.length === 0) continue;
      const heading = backgroundHeading({
        title: d.get("title") ?? "",
        company: d.get("company") ?? "",
        startDate: d.get("startDate") ?? "",
        endDate: d.get("endDate") ?? "",
      });
      const block = `POSITION: ${heading}\n${truncate(parts.join("\n\n"), BACKGROUND_CHARS)}`;
      if (total + block.length > MAX_BACKGROUND_TOTAL_CHARS) break;
      total += block.length;
      blocks.push(block);
    }
    if (blocks.length === 0) return NextResponse.json({ error: "no_stories" }, { status: 400 });

    const settings = toVoiceSettings(userSnap.get("voiceSettings"));
    const voiceProfile = ((userSnap.get("voiceProfile") as string | undefined) ?? "").trim();

    let message = `QUESTION:\n${truncate(question, MAX_QUESTION_CHARS)}\n\n---\n\nSTORIES (the candidate's own notes on past positions; true facts):\n${blocks.join("\n\n")}`;
    if (jobSnap?.exists)
      message += `\n\n---\n\nJOB: ${jobSnap.get("title")} at ${jobSnap.get("company")}\n${truncate(
        (jobSnap.get("description") as string | undefined) ?? "",
        6000
      )}`;
    const company = companySnap?.docs[0];
    if (company) {
      const facts = COMPANY_FIELDS.map((f) => [f, company.get(f)] as const)
        .filter(([, v]) => typeof v === "string" && v.trim())
        .map(([f, v]) => `${f}: ${v}`);
      if (facts.length) message += `\n\n---\n\nCOMPANY:\n${facts.join("\n")}`;
    }

    const system = [
      SYSTEM,
      voiceProfile && `VOICE PROFILE\n"""\n${voiceProfile}\n"""`,
      settings.guidelines.trim() && `GUIDELINES FROM THE CANDIDATE\n"""\n${truncate(settings.guidelines, 6000)}\n"""`,
      settings.neverSay.trim() && `WORDS AND PHRASES THE CANDIDATE BANS (never use them)\n"""\n${truncate(settings.neverSay, 6000)}\n"""`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const messages: Anthropic.MessageParam[] = [{ role: "user", content: message }];
    const model = voiceProfile ? WRITING_MODEL : undefined;
    const draft = await callAI(uid, messages, system, 1024, model);
    if ("error" in draft)
      return NextResponse.json(
        { error: draft.error },
        { status: draft.error === "no_key" ? 401 : 500 }
      );

    const result = await enforceBannedPhrases(
      uid,
      messages,
      system,
      draft.content,
      parseBannedPhrases(settings.neverSay),
      1024,
      model
    );
    return NextResponse.json({ answer: result.content.trim(), bannedPhrasesLeft: result.remaining });
  } catch (err) {
    console.error("[draft-answer] Error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
