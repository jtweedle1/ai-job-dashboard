import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkClaims, loadClaimSources } from "@/lib/letter-sources";

// Re-traces a saved letter's claims, e.g. after the user edits it by hand.
export async function POST(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { uid } = authResult;

    const { limited } = await checkRateLimit(uid);
    if (limited) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const { letterId } = await request.json();
    if (!letterId || typeof letterId !== "string")
      return NextResponse.json({ error: "missing fields" }, { status: 400 });

    const userRef = adminDb.collection("users").doc(uid);
    const letterRef = userRef.collection("coverLetters").doc(letterId);
    const letterSnap = await letterRef.get();
    if (!letterSnap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const content = (letterSnap.get("content") as string | undefined) ?? "";
    const resumeId = letterSnap.get("resumeId") as string | undefined;
    const resumeSnap = resumeId ? await userRef.collection("resumes").doc(resumeId).get() : null;
    const resume = (resumeSnap?.get("content") as string | undefined) ?? "";

    const sources = await loadClaimSources(uid, resume, (letterSnap.get("notes") as string | undefined) ?? "");
    const result = await checkClaims(uid, content, sources);
    if ("error" in result)
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "no_key" ? 401 : 500 }
      );

    await letterRef.update({ claims: result.claims });
    return NextResponse.json({ claims: result.claims });
  } catch (err) {
    console.error("[letter-claims] Error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
