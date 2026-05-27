import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { encrypt } from "@/lib/encryption";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid");
  if (!uid) return NextResponse.json({ error: "missing uid" }, { status: 400 });

  const snap = await adminDb.collection("users").doc(uid).get();
  const hasKey = !!snap.data()?.apiKey;
  return NextResponse.json({ hasKey });
}

export async function POST(request: Request) {
  const { uid, apiKey } = await request.json();
  if (!uid || !apiKey) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const encrypted = encrypt(apiKey);
  await adminDb.collection("users").doc(uid).set({ apiKey: encrypted }, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { uid } = await request.json();
  if (!uid) return NextResponse.json({ error: "missing uid" }, { status: 400 });

  await adminDb.collection("users").doc(uid).set({ apiKey: null }, { merge: true });
  return NextResponse.json({ ok: true });
}
