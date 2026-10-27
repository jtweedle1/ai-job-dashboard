import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { callAI, WRITING_MODEL } from "@/lib/ai";
import { requireAuth } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getVoiceSamples, pickExamples, truncate, type VoiceSample } from "@/lib/voice-server";
import { computeVoiceStats, describeVoiceStats } from "@/lib/voice-stats";
import { findBannedPhrases, parseBannedPhrases } from "@/lib/banned-phrases";
import { toVoiceSettings, type VoiceSettings } from "@/types/writingSample";
import { BACKGROUND_QUESTIONS, backgroundHeading, toBackgroundAnswers } from "@/types/background";

// Default prompt, used until the user has set up their voice.
const SYSTEM_TEMPLATE = `You are an expert cover letter writer who specializes in natural, human-sounding applications that feel warm, specific, and professional without sounding stiff or AI-generated.

Your task is to write the body of a cover letter for a candidate using:
1. The candidate’s uploaded resume
2. The job description provided by the user
3. Any extra context the user gives about the company, role, or application

Goal:
Write a concise, tailored cover letter body that sounds like a smart friend talking to another friend over coffee: relaxed, clear, sincere, and professional. Create it at a Grade 10 reading level.

Length:
150-200 words.

Style requirements:
- Sound natural, specific, and human.
- Avoid stereotypical AI phrases such as:
  - “I am writing to express my interest”
  - “I am excited to apply”
  - “I believe my skills align”
  - “My background has equipped me”
  - “I would be a valuable asset”
  - “Thank you for your time and consideration”
- Do not over-flatter the company.
- Do not make things up that aren't in the resume or the candidate's BACKGROUND notes.
- If BACKGROUND notes are given, draw on their specific stories, results, and team details rather than restating resume bullets.
- Do not just repeat the resume bullet points; incorporate the candidate's experience relevant to the job description.
- Do not use corporate buzzwords or overly polished language.
- Use contractions where natural.
- Keep the tone warm, direct, and conversational.
- Make the candidate sound thoughtful, capable, and genuinely interested.

{{VOICE}}

Before writing:
- Read the resume and job description carefully.
- Identify the strongest overlap between the candidate’s experience and the role.
- Prioritize specificity over generic enthusiasm.
- If important information is missing, make a reasonable assumption instead of adding placeholders.

Output only the cover letter body.
Do not include explanations, notes, bullet points, or multiple versions.`;

// Fallback for users who haven't set up their voice yet.
const DEFAULT_REFERENCE = `Use this cover letter as a reference for the structure of the cover letter, but do not copy its wording:

“Dear One Design Co team,
I saw your job posting through a friend who passed it on to me via the Shoptalk Show discord. I was really excited when I saw your posting because I have been looking for new opportunities to work with a design-forward agency that delivers amazing front-end experiences for users.
To give you a bit of an introduction, I spent [TIME] working at Best of Western, a motion-driven design agency that delivered animated web experiences for clients in the film-making industry, primarily with their home-built PHP CMS. There, I also worked on several Shopify and Astro projects, as well as a SaaS application for creating custom pitch decks using [stack].
In recent months, I've been freelancing, doing small roles for local businesses. One project I'm particularly excited about is an Astro website I'm building for the organization Whose Knowledge? focused on their Accessible Language tech research in Hindi, Urdu and Bangla.
I'm a quick learner and can pick up new technologies quickly to support the full breadth of client needs, and I'm well-versed with the dynamics of a fast-moving agency. I'm based in Chicago and am open to coming into the office for this position.
Don't hesitate to reach out if you have any questions about my application,
Grace”`;

// Phrases that read as AI-generated. Any the user writes themselves are allowed back in.
const AI_CLICHES = [
  "I am writing to express my interest",
  "I am excited to apply",
  "I believe my skills align",
  "My background has equipped me",
  "I would be a valuable asset",
  "Thank you for your time and consideration",
  "I am confident that",
  "dynamic team",
  "fast-paced environment",
  "passionate about leveraging",
];

const EXAMPLE_CHARS = 6000;
const FALLBACK_WORDS = 300;

function normalize(text: string): string {
  return text.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ");
}

// Users paste these in any shape (comma lists, headings, bullet rules), so pass them through as written.
const MAX_RULES_CHARS = 12000;
const MAX_NOTES_CHARS = 2000;

function writingRulesSection(settings: VoiceSettings): string | null {
  const sections: string[] = [];
  const guidelines = settings.guidelines.trim();
  const avoid = settings.neverSay.trim();
  if (guidelines)
    sections.push(`GUIDELINES FROM THE CANDIDATE (follow these for every letter)
"""
${truncate(guidelines, MAX_RULES_CHARS)}
"""`);
  if (avoid)
    sections.push(`WORDS AND PHRASES THE CANDIDATE BANS (never use any of them, in any form; follow any rules listed here too)
"""
${truncate(avoid, MAX_RULES_CHARS)}
"""`);
  return sections.length ? sections.join("\n\n") : null;
}

// One rewrite pass when the draft still contains banned phrases. Returns whatever is left after it.
async function enforceBannedPhrases(
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
        content: `This letter uses words or phrases I banned: ${found.map((f) => `"${f}"`).join(", ")}.
Rewrite only the sentences that contain them, in my voice, without using any other banned phrase. Keep everything else exactly the same. Output only the full letter.`,
      },
    ],
    system,
    maxTokens,
    model
  );
  if ("error" in revision) return { content: draft, remaining: found };
  return { content: revision.content, remaining: findBannedPhrases(revision.content, phrases) };
}

const MAX_BACKGROUNDS = 20;
const BACKGROUND_CHARS = 8000;
const MAX_BACKGROUND_TOTAL_CHARS = 40000;

// The positions the user picked for this letter, or the ones they have switched on if the client sent none.
async function getSelectedBackgrounds(uid: string, ids: unknown): Promise<string | null> {
  const col = adminDb.collection("users").doc(uid).collection("backgrounds");
  let docs: DocumentSnapshot[];
  if (Array.isArray(ids)) {
    const valid = [...new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0))].slice(
      0,
      MAX_BACKGROUNDS
    );
    if (valid.length === 0) return null;
    docs = await adminDb.getAll(...valid.map((id) => col.doc(id)));
  } else {
    docs = (await col.where("included", "==", true).limit(MAX_BACKGROUNDS).get()).docs;
  }

  const blocks: string[] = [];
  let total = 0;
  for (const d of docs) {
    if (!d.exists) continue;
    const answers = toBackgroundAnswers(d.get("answers"));
    const known = new Set(BACKGROUND_QUESTIONS.map((q) => q.id));
    const parts = BACKGROUND_QUESTIONS.filter((q) => answers[q.id]?.trim()).map(
      (q) => `${q.label}\n${answers[q.id].trim()}`
    );
    for (const [k, v] of Object.entries(answers)) if (!known.has(k) && v.trim()) parts.push(v.trim());
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
  return blocks.length ? blocks.join("\n\n") : null;
}

function buildVoiceSystem(
  profile: string,
  samples: VoiceSample[],
  settings: VoiceSettings
): string {
  const examples = pickExamples(samples);
  const letterSamples = samples.filter((s) => s.isCoverLetter);
  const stats = computeVoiceStats((letterSamples.length ? letterSamples : samples).map((s) => s.content));
  const targetWords =
    settings.targetWords ?? (letterSamples.length ? stats.medianWords : FALLBACK_WORDS);

  const sampleText = normalize(samples.map((s) => s.content).join("\n"));
  const cliches = AI_CLICHES.filter((p) => !sampleText.includes(normalize(p)));

  const format =
    settings.format === "full"
      ? "Write the full letter: a greeting addressed to this company in the candidate's usual style, the body, and their usual sign-off and name exactly as they write them."
      : "Write only the body paragraphs: no greeting, no sign-off, no name.";

  const sections = [
    `You ghostwrite cover letters for one specific person. Your goal is a letter they would read and think "that sounds exactly like me." Sounding like them matters more than sounding polished.`,

    `HOW TO SOUND LIKE THEM
- Study the EXAMPLES below closely. Mirror their structure, paragraph count, rhythm, warmth, and how they explain why a role matters to them.
- Keep their personality: the asides, the value statements, the memorable closing lines, the small stories about how they got into their work. These are what make the letter theirs. Don't sand them down into generic professional prose.
- Reusing their signature lines and recurring phrases word for word is good (for example a line about who they are or a closing they always use). Never reuse company-specific details from the examples.
- Follow the VOICE PROFILE. Where it disagrees with the examples, the examples win.
- The candidate's own GUIDELINES, BANNED PHRASES, and NOTES FOR THIS LETTER (if given) override everything else, including phrases that appear in their examples.`,

    `LENGTH AND FORMAT
- About ${targetWords} words (stay within 15%).
- ${format}`,

    `FACTS
- Only state facts about the candidate that appear in the RESUME, the BACKGROUND notes, the THINGS TO WEAVE IN notes, or their own hand-written examples. Don't invent numbers, tools, titles, or results.
- The BACKGROUND notes are the candidate's own detailed account of past positions. Pick the one or two stories or results that best fit this job and tell them concretely in the candidate's voice. Don't try to cover everything, and don't copy the notes word for word.
- Use the job description to choose which of their experiences to lead with and to connect them to what this company needs.
- If something is missing, make a reasonable choice. Never leave placeholders like [TIME].`,

    `NEVER USE
${cliches.map((c) => `- "${c}"`).join("\n")}`,
  ];

  const rules = writingRulesSection(settings);
  if (rules) sections.push(rules);

  if (stats.sampleCount > 0)
    sections.push(`MEASUREMENTS OF THEIR WRITING (facts, not suggestions)\n${describeVoiceStats(stats)}`);
  if (profile) sections.push(`VOICE PROFILE\n"""\n${profile}\n"""`);

  examples.forEach((e, i) => {
    const kind = e.isCoverLetter ? "cover letter" : "other writing";
    const origin = e.handWritten ? "written by them" : "an AI draft they approved";
    sections.push(`EXAMPLE ${i + 1} (${kind}, ${origin})\n"""\n${truncate(e.content, EXAMPLE_CHARS)}\n"""`);
  });

  sections.push("Output only the letter. No notes, explanations, or alternatives.");
  return sections.join("\n\n");
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { uid } = authResult;

    const { limited } = await checkRateLimit(uid);
    if (limited) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const { jobId, resumeId, backgroundIds, notes } = await request.json();
    if (!jobId || !resumeId)
      return NextResponse.json({ error: "missing fields" }, { status: 400 });

    const userRef = adminDb.collection("users").doc(uid);
    const [jobSnap, resumeSnap, userSnap, voiceSamples, background] = await Promise.all([
      userRef.collection("jobs").doc(jobId).get(),
      userRef.collection("resumes").doc(resumeId).get(),
      userRef.get(),
      getVoiceSamples(uid),
      getSelectedBackgrounds(uid, backgroundIds),
    ]);

    if (!jobSnap.exists || !resumeSnap.exists)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

    const job = jobSnap.data()!;
    const resume = resumeSnap.data()!;
    const voiceProfile = ((userSnap.get("voiceProfile") as string | undefined) ?? "").trim();
    const settings = toVoiceSettings(userSnap.get("voiceSettings"));
    const voiceMode = voiceSamples.length > 0 || voiceProfile.length > 0;

    let userMessage = `JOB TITLE: ${job.title}
COMPANY: ${job.company}

JOB DESCRIPTION:
${job.description || "(no description provided)"}

---

RESUME:
${resume.content}`;
    if (background)
      userMessage += `\n\n---\n\nBACKGROUND (the candidate's own detailed notes on past positions; true facts):\n${background}`;
    if (voiceMode && settings.alwaysMention.trim())
      userMessage += `\n\n---\n\nTHINGS TO WEAVE IN WHEN RELEVANT (true facts from the candidate):\n${settings.alwaysMention.trim()}`;
    const letterNotes = typeof notes === "string" ? notes.trim() : "";
    if (letterNotes)
      userMessage += `\n\n---\n\nNOTES FOR THIS LETTER (from the candidate; follow them, and treat facts in them as true):\n${truncate(letterNotes, MAX_NOTES_CHARS)}`;

    const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
    const system = voiceMode
      ? buildVoiceSystem(voiceProfile, voiceSamples, settings)
      : [SYSTEM_TEMPLATE.replace("{{VOICE}}", DEFAULT_REFERENCE), writingRulesSection(settings)]
          .filter(Boolean)
          .join("\n\n");
    const maxTokens = voiceMode ? 2048 : 1024;
    const model = voiceMode ? WRITING_MODEL : undefined;

    const draft = await callAI(uid, messages, system, maxTokens, model);
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
      maxTokens,
      model
    );

    const ref = await adminDb
      .collection("users")
      .doc(uid)
      .collection("coverLetters")
      .add({
        jobId,
        resumeId,
        content: result.content,
        edited: false,
        useAsVoiceSample: false,
        createdAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({
      id: ref.id,
      content: result.content,
      usedVoice: voiceMode,
      bannedPhrasesLeft: result.remaining,
    });
  } catch (err) {
    console.error("[cover-letter] Error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
