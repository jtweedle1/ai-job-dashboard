import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { callAI } from "@/lib/ai";
import { requireAuth } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";

const SYSTEM = `You are an expert interview coach. Given a job description and a description of the interview process, generate targeted prep material.
Return ONLY valid JSON with exactly two keys — no markdown, no explanation outside the JSON:
- "questions": an array of 8-10 strings, each a complete interview question tailored to the specific role and process described
- "studyTips": a string with 4-6 concise, actionable study tips separated by newlines (each tip on its own line, no bullet characters)
Mix behavioral, situational, and role-specific technical questions as appropriate for the process described.`;

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { uid } = authResult;

    const { limited } = await checkRateLimit(uid);
    if (limited) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const { jobId, interviewProcess } = await request.json();
    if (!jobId || !interviewProcess)
      return NextResponse.json({ error: "missing fields" }, { status: 400 });

    const jobSnap = await adminDb
      .collection("users").doc(uid).collection("jobs").doc(jobId).get();

    if (!jobSnap.exists)
      return NextResponse.json({ error: "job_not_found" }, { status: 404 });

    const job = jobSnap.data()!;

    const userMessage = `JOB TITLE: ${job.title}
COMPANY: ${job.company}

JOB DESCRIPTION:
${job.description || "(no description provided)"}

---

INTERVIEW PROCESS:
${interviewProcess}`;

    const result = await callAI(uid, [{ role: "user", content: userMessage }], SYSTEM, 2048);

    if ("error" in result)
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "no_key" ? 401 : 500 }
      );

    let questions: string[];
    let studyTips: string;
    try {
      const raw = result.content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();
      const parsed = JSON.parse(raw);
      questions = Array.isArray(parsed.questions) ? parsed.questions : [];
      studyTips = String(parsed.studyTips ?? "");
    } catch {
      console.error("[interview-prep] JSON parse failed:", result.content);
      return NextResponse.json({ error: "parse_failed" }, { status: 500 });
    }

    const ref = await adminDb
      .collection("users").doc(uid).collection("interviewPreps")
      .add({
        jobId,
        interviewProcess,
        mockQuestions: questions,
        studyTips,
        createdAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ id: ref.id, questions, studyTips });
  } catch (err) {
    console.error("[interview-prep] Error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
