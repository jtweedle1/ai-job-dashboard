import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { callAI, callAIWithWebSearch } from "@/lib/ai";
import { requireAuth } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";

const SYSTEM = `You are a company research assistant. Use web search to find current, accurate information about the company before responding.

Search for:
1. The company's website and about page
2. Recent news, funding rounds, product launches, or announcements from the past 6 months
3. The company's LinkedIn or Crunchbase profile
4. Employee reviews or culture information (Glassdoor, Blind, etc.)

After searching, return ONLY valid JSON with exactly these keys — no markdown, no explanation outside the JSON:
- "whatTheyDo": 2-3 sentences describing what the company does and their business model
- "productSummary": 1 paragraph about their main product or service, based on current information
- "targetCustomers": who they primarily sell to (industries, company sizes, personas)
- "recentNews": a specific recent event from the past year — funding round, product launch, leadership change, or notable announcement. Include approximate date if known. Do NOT leave this null unless the company truly has no findable online presence.
- "values": company culture notes or stated values from their website or employee reviews
- "competitors": 3-5 main competitors in their space, comma-separated

Use null only if you genuinely cannot find information after searching. Do not guess or fabricate details.`;

const SYSTEM_FALLBACK = `You are a company research assistant. Using your training knowledge, fill in what you can about this company.
Return ONLY valid JSON with exactly these keys — no markdown, no explanation outside the JSON:
- "whatTheyDo": 2-3 sentences describing what the company does and their business model
- "productSummary": 1 paragraph about their main product or service
- "targetCustomers": who they primarily sell to (industries, company sizes, personas)
- "recentNews": any notable milestone, funding round, or product launch you are aware of (null if unknown)
- "values": company culture notes or stated values (null if unknown)
- "competitors": 3-5 main competitors in their space, comma-separated (null if unknown)
Use null for any field you don't have reliable knowledge about. Do not fabricate details.`;

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { uid } = authResult;

    const { limited } = await checkRateLimit(uid);
    if (limited) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

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

    let result = await callAIWithWebSearch(uid, [{ role: "user", content: userMessage }], SYSTEM, 2048);

    if ("error" in result) {
      console.error("[company-research] web-search call failed:", result.error, "— falling back to standard call");
      result = await callAI(uid, [{ role: "user", content: userMessage }], SYSTEM_FALLBACK, 2048);
    }

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
