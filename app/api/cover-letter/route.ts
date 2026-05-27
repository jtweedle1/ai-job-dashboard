import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { callAI } from "@/lib/ai";

const SYSTEM = `You are an expert cover letter writer. Write a concise, tailored cover letter of 3–4 paragraphs (no more than 350 words). Match the candidate's actual experience and skills to the specific requirements in the job description. Do not use generic filler phrases like "I am writing to express my interest" or "I am a passionate and hardworking individual." Write in first person. Output only the cover letter body — no subject line, date, salutation, or closing signature.`;

export async function POST(request: Request) {
  try {
    const { uid, jobId, resumeId } = await request.json();
    if (!uid || !jobId || !resumeId)
      return NextResponse.json({ error: "missing fields" }, { status: 400 });

    const [jobSnap, resumeSnap] = await Promise.all([
      adminDb.collection("users").doc(uid).collection("jobs").doc(jobId).get(),
      adminDb.collection("users").doc(uid).collection("resumes").doc(resumeId).get(),
    ]);

    if (!jobSnap.exists || !resumeSnap.exists)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

    const job = jobSnap.data()!;
    const resume = resumeSnap.data()!;

    const userMessage = `JOB TITLE: ${job.title}
COMPANY: ${job.company}

JOB DESCRIPTION:
${job.description || "(no description provided)"}

---

RESUME:
${resume.content}`;

    const result = await callAI(uid, [{ role: "user", content: userMessage }], SYSTEM);

    if ("error" in result)
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "no_key" ? 401 : 500 }
      );

    const ref = await adminDb
      .collection("users")
      .doc(uid)
      .collection("coverLetters")
      .add({
        jobId,
        resumeId,
        content: result.content,
        createdAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ id: ref.id, content: result.content });
  } catch (err) {
    console.error("[cover-letter] Error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
