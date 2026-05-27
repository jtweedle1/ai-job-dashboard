import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { requireAuth } from "@/lib/auth-server";

const SYSTEM = `You are a job posting parser. Extract structured fields from the job description text the user provides.
Return ONLY valid JSON with these exact keys: title, company, location, salary.
- title: job title string
- company: company name string
- location: location string or null
- salary: salary/compensation string or null
If a field cannot be determined, use null. Do not include any explanation or markdown — only the JSON object.`;

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { uid } = authResult;

  const { text } = await request.json();
  if (!text) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const result = await callAI(uid, [{ role: "user", content: text }], SYSTEM);

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.error === "no_key" ? 401 : 500 });

  try {
    const raw = result.content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const parsed = JSON.parse(raw);
    // Pass the original JD text back as description — no need to regenerate it
    return NextResponse.json({ ...parsed, description: text });
  } catch {
    console.error("[extract-job] JSON parse failed. Raw response:", result.content);
    return NextResponse.json({ error: "parse_failed" }, { status: 500 });
  }
  } catch (err) {
    console.error("[extract-job] Unhandled error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
