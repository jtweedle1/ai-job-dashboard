import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { encrypt } from "@/lib/encryption";
import { requireAuth } from "@/lib/auth-server";

export async function GET(request: Request) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  const snap = await adminDb.collection("users").doc(uid).get();
  const hasKey = !!snap.data()?.apiKey;
  return NextResponse.json({ hasKey });
}

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  const { apiKey } = await request.json();
  if (!apiKey) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const encrypted = encrypt(apiKey);
  await adminDb.collection("users").doc(uid).set({ apiKey: encrypted }, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  await adminDb.collection("users").doc(uid).set({ apiKey: null }, { merge: true });
  return NextResponse.json({ ok: true });
}
