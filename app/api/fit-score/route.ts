import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { callAI } from "@/lib/ai";

const SYSTEM = `You are a career advisor evaluating how well a candidate's resume matches a job description.
Respond with only a valid JSON object — no markdown, no explanation, nothing else.
The JSON must have exactly two keys:
- "score": an integer from 0 to 100 representing fit (100 = perfect match)
- "reasoning": 2-3 sentences explaining the score, focusing on the strongest matches and most significant gaps`;

export async function POST(request: Request) {
  try {
    const { uid, jobId } = await request.json();
    if (!uid || !jobId)
      return NextResponse.json({ error: "missing fields" }, { status: 400 });

    // Fetch job and user doc in parallel
    const [jobSnap, userSnap] = await Promise.all([
      adminDb.collection("users").doc(uid).collection("jobs").doc(jobId).get(),
      adminDb.collection("users").doc(uid).get(),
    ]);

    if (!jobSnap.exists)
      return NextResponse.json({ error: "job_not_found" }, { status: 404 });

    const job = jobSnap.data()!;
    const userData = userSnap.data() ?? {};
    const goals: string = userData.goals ?? "";

    // Resolve resume: prefer activeResumeId, fall back to first resume
    let resumeContent: string | null = null;
    const activeResumeId: string | null = userData.activeResumeId ?? null;

    if (activeResumeId) {
      const resumeSnap = await adminDb
        .collection("users").doc(uid).collection("resumes").doc(activeResumeId).get();
      if (resumeSnap.exists) resumeContent = resumeSnap.data()!.content as string;
    }

    if (!resumeContent) {
      const resumesSnap = await adminDb
        .collection("users").doc(uid).collection("resumes").limit(1).get();
      if (!resumesSnap.empty) resumeContent = resumesSnap.docs[0].data().content as string;
    }

    if (!resumeContent)
      return NextResponse.json({ error: "no_resume" }, { status: 400 });

    const userMessage = `JOB TITLE: ${job.title}
COMPANY: ${job.company}

JOB DESCRIPTION:
${job.description || "(no description provided)"}

---

RESUME:
${resumeContent}${goals ? `\n\n---\n\nCAREER GOALS:\n${goals}` : ""}`;

    const result = await callAI(uid, [{ role: "user", content: userMessage }], SYSTEM);

    if ("error" in result)
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "no_key" ? 401 : 500 }
      );

    let score: number;
    let reasoning: string;
    try {
      const raw = result.content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();
      const parsed = JSON.parse(raw);
      score = Math.min(100, Math.max(0, Math.round(Number(parsed.score))));
      reasoning = String(parsed.reasoning);
    } catch {
      console.error("[fit-score] JSON parse failed:", result.content);
      return NextResponse.json({ error: "parse_failed" }, { status: 500 });
    }

    // Save back to job document
    await adminDb.collection("users").doc(uid).collection("jobs").doc(jobId).update({
      fitScore: score,
      fitReasoning: reasoning,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ score, reasoning });
  } catch (err) {
    console.error("[fit-score] Error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
