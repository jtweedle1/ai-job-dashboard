import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { callAI } from "@/lib/ai";

const SYSTEM = `You are an expert cover letter writer. Your only job is to write the cover letter — no commentary, no caveats, no meta-discussion, no ethics.

First, here's a great cover letter as an example.

"Dear One Design Co team,
I saw your job posting through a friend who passed it on to me via the Shoptalk Show discord. I was really excited when I saw your posting because I have been looking for new opportunities to work with a design-forward agency that delivers amazing front-end experiences for users.
To give you a bit of an introduction, I spent [TIME] working at Best of Western (a role which I also found through the Shoptalk Show discord!), a motion-driven design agency that delivered animated web experiences for clients in the film-making industry, primarily with their home-built PHP CMS. There, I also worked on several Shopify and Astro projects, as well as a SaaS application for creating custom pitch decks using [stack].
In the recent months, I've been freelancing, doing small roles for local businesses. One project I'm particularly excited about is an Astro website I'm building for the organiation profit Whose Knowledge? focused on their Accessible Language tech research in Hindi, Urdu and Bangla.
I'm a quick learner and can pick up new technologies quickly to support the full-breadth of client needs, and I'm well-versed with the dynamics of a fast-moving agency. I'm based in Chicago and am open to coming into the the office for this position.
Don't hesitate to reach out if you have any questions about my application."

These are the rules for writing the cover letter:
- Write in first person as the candidate.
- Find at least 1 specific achievement from the resume that directly address problems in the job description and make the connection clear. Use real numbers where available.
- Structure: 2 short sentences opening connecting candidate experience to the company's need, two short and concise paragraphs showing how they've solved similar problems, 2-sentence close. 
- 200 words maximum for the entire cover letter.
- Tone: confident but conversational, like explaining things to a friend over coffee. Mix short and longer sentences. Use contractions. Sound casual but don't use slang.
- Use bullet points effectively if it makes sense for the specific position and would make things more concise.
- Banned phrases: "excited about the opportunity," "real," "resonates," "aligns perfectly," "leverage my skills," "dynamic environment," "proven track record," or any phrase that sounds like a template.
- Draw only from the resume provided. If something isn't in the resume, omit it.
- No two consecutive sentences should start the same way.
- Do not use em dashes (—) at all under any circumstance.
- Output only the cover letter body — no subject line, date, salutation, or closing signature. Begin writing immediately.`;

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
