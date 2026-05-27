import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { callAI } from "@/lib/ai";
import { Timestamp } from "firebase-admin/firestore";
import { requireAuth } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";

const SYSTEM = `You are a job search coach helping someone reflect on their week.
Given the week's stats and notes, write:
1. A short narrative summary (2–3 sentences) that honestly assesses the week's momentum.
2. Three specific, actionable next steps for the coming week — based directly on what they shared.

Format your response exactly like this:
SUMMARY
[your 2-3 sentence narrative here]

NEXT STEPS
- [step 1]
- [step 2]
- [step 3]

Be direct and practical. No filler phrases. Treat the person as a capable adult.`;

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { uid } = authResult;

    const { limited } = await checkRateLimit(uid);
    if (limited) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const { reviewId } = await req.json();
    if (!reviewId) {
      return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    const reviewSnap = await adminDb
      .collection("users")
      .doc(uid)
      .collection("weeklyReviews")
      .doc(reviewId)
      .get();

    if (!reviewSnap.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const r = reviewSnap.data()!;
    const weekOf = r.weekOf instanceof Timestamp
      ? r.weekOf.toDate().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "this week";

    const prompt = `Week of ${weekOf}:
- Applications sent: ${r.applicationsSent ?? 0}
- Interviews booked: ${r.interviewsBooked ?? 0}
- Responses received: ${r.responsesReceived ?? 0}
${r.bestResumeVersion ? `- Best-performing resume version: ${r.bestResumeVersion}` : ""}
${r.rolesToDeprioritize ? `- Roles to deprioritize: ${r.rolesToDeprioritize}` : ""}
${r.nextWeekFocus ? `- Next week focus: ${r.nextWeekFocus}` : ""}`;

    const result = await callAI(uid, [{ role: "user", content: prompt }], SYSTEM);

    if ("error" in result) {
      const status = result.error === "no_key" ? 401 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    await adminDb
      .collection("users")
      .doc(uid)
      .collection("weeklyReviews")
      .doc(reviewId)
      .update({ aiSummary: result.content, updatedAt: Timestamp.now() });

    return NextResponse.json({ aiSummary: result.content });
  } catch (err) {
    console.error("[weekly-summary]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
