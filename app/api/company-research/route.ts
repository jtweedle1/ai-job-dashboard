import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { callAI } from "@/lib/ai";
import { requireAuth } from "@/lib/auth-server";

const SYSTEM = `You are a company research assistant. Given a company name and optional job context, fill in research fields using your knowledge of the company.
Return ONLY valid JSON with exactly these keys — no markdown, no explanation outside the JSON:
- "whatTheyDo": 200-300 words describing what the company does and their business model
- "productSummary": 1 paragraph about their main product or service
- "targetCustomers": who they primarily sell to (industries, company sizes, personas)
- "recentNews": a notable recent milestone, funding round, product launch, or news item (acknowledge if uncertain)
- "values": company culture notes or stated values
- "competitors": 3-5 main competitors in their space, comma-separated
For each field use simple language and avoid jargon. For any field you cannot confidently fill, use null.`;

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { uid } = authResult;

    const { companyId } = await request.json();
    if (!companyId)
      return NextResponse.json({ error: "missing fields" }, { status: 400 });

    const companySnap = await adminDb
      .collection("users").doc(uid).collection("companies").doc(companyId).get();

    if (!companySnap.exists)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

    const company = companySnap.data()!;

    let jobContext = "";
    if (company.jobId) {
      const jobSnap = await adminDb
        .collection("users").doc(uid).collection("jobs").doc(company.jobId as string).get();
      if (jobSnap.exists) {
        const job = jobSnap.data()!;
        jobContext = `\n\nLinked role: ${job.title}`;
      }
    }

    const userMessage = `Company: ${company.name}${jobContext}`;

    const result = await callAI(uid, [{ role: "user", content: userMessage }], SYSTEM);

    if ("error" in result)
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "no_key" ? 401 : 500 }
      );

    let fields: Record<string, string | null>;
    try {
      const raw = result.content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();
      fields = JSON.parse(raw);
    } catch {
      console.error("[company-research] JSON parse failed:", result.content);
      return NextResponse.json({ error: "parse_failed" }, { status: 500 });
    }

    const patch = {
      whatTheyDo:      fields.whatTheyDo      ?? null,
      productSummary:  fields.productSummary  ?? null,
      targetCustomers: fields.targetCustomers ?? null,
      recentNews:      fields.recentNews      ?? null,
      values:          fields.values          ?? null,
      competitors:     fields.competitors     ?? null,
      updatedAt:       FieldValue.serverTimestamp(),
    };

    await adminDb
      .collection("users").doc(uid).collection("companies").doc(companyId).update(patch);

    return NextResponse.json(fields);
  } catch (err) {
    console.error("[company-research] Error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
