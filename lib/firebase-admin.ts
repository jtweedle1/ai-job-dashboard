import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const requiredAdminEnvVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
] as const;

for (const varName of requiredAdminEnvVars) {
  if (!process.env[varName]) {
    throw new Error(
      `Missing required environment variable: ${varName}. ` +
      "Check your .env.local or Vercel environment settings."
    );
  }
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n");
if (!privateKey.includes("-----BEGIN RSA PRIVATE KEY-----") && !privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
  throw new Error(
    "FIREBASE_PRIVATE_KEY appears malformed — expected a PEM-formatted RSA private key. " +
    "Ensure newlines are stored as \\n in the environment variable."
  );
}

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey,
      }),
    });
  } catch (err) {
    throw new Error(
      `Firebase Admin SDK failed to initialize: ${err instanceof Error ? err.message : String(err)}. ` +
      "Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }
}

export const adminDb = getFirestore();