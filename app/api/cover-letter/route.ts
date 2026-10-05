import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { callAI } from "@/lib/ai";
import { requireAuth } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";

const SYSTEM = `You are an expert cover letter writer who specializes in natural, human-sounding applications that feel warm, specific, and professional without sounding stiff or AI-generated.

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
- Do not make things up that aren't in the resume.
- Do not just repeat the resume bullet points; incorporate the candidate's experience relevant to the job description.
- Do not use corporate buzzwords or overly polished language.
- Use contractions where natural.
- Keep the tone warm, direct, and conversational.
- Make the candidate sound thoughtful, capable, and genuinely interested.

Use this cover letter as a reference for the structure of the cover letter, but do not copy its wording:

“Dear One Design Co team,
I saw your job posting through a friend who passed it on to me via the Shoptalk Show discord. I was really excited when I saw your posting because I have been looking for new opportunities to work with a design-forward agency that delivers amazing front-end experiences for users.
To give you a bit of an introduction, I spent [TIME] working at Best of Western, a motion-driven design agency that delivered animated web experiences for clients in the film-making industry, primarily with their home-built PHP CMS. There, I also worked on several Shopify and Astro projects, as well as a SaaS application for creating custom pitch decks using [stack].
In recent months, I've been freelancing, doing small roles for local businesses. One project I'm particularly excited about is an Astro website I'm building for the organization Whose Knowledge? focused on their Accessible Language tech research in Hindi, Urdu and Bangla.
I'm a quick learner and can pick up new technologies quickly to support the full breadth of client needs, and I'm well-versed with the dynamics of a fast-moving agency. I'm based in Chicago and am open to coming into the office for this position.
Don't hesitate to reach out if you have any questions about my application,
Grace”

Before writing:
- Read the resume and job description carefully.
- Identify the strongest overlap between the candidate’s experience and the role.
- Prioritize specificity over generic enthusiasm.
- If important information is missing, make a reasonable assumption instead of adding placeholders.

Output only the cover letter body.
Do not include explanations, notes, bullet points, or multiple versions.`;

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { uid } = authResult;

    const { limited } = await checkRateLimit(uid);
    if (limited) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const { jobId, resumeId } = await request.json();
    if (!jobId || !resumeId)
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
