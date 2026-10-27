import { NextResponse } from "next/server";
// Must load before pdf-parse so its worker resolves on Vercel serverless.
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import { requireAuth } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  const { limited } = await checkRateLimit(uid);
  if (limited) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds the 5 MB limit" }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return NextResponse.json({ text: result.text.trim() });
  } catch {
    return NextResponse.json({ error: "Failed to parse PDF" }, { status: 500 });
  }
}
