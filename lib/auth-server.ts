// Usage in route handlers:
// const authResult = await requireAuth(request);
// if (authResult instanceof NextResponse) return authResult;
// const { uid } = authResult;

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
// Importing adminDb ensures the Firebase Admin app is initialized before getAuth() is called.
import { adminDb as _adminDb } from "@/lib/firebase-admin";

void _adminDb; // imported solely to guarantee app initialization side-effect

export async function requireAuth(
  request: Request
): Promise<NextResponse | { uid: string }> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    const decoded = await getAuth().verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
