import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai";

const SYSTEM = `You are a job posting parser. Extract structured fields from the job description text the user provides.
Return ONLY valid JSON with these keys: title, company, location, salary, description.
- title: job title string
- company: company name string
- location: location string or null
- salary: salary/compensation string or null
- description: the full cleaned job description text
If a field cannot be determined, use null. Do not include any explanation or markdown — only the JSON object.`;

export async function POST(request: Request) {
  const { uid, text } = await request.json();
  if (!uid || !text) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const result = await callAI(uid, [{ role: "user", content: text }], SYSTEM);

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.error === "no_key" ? 401 : 500 });

  try {
    const parsed = JSON.parse(result.content);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "parse_failed" }, { status: 500 });
  }
}
