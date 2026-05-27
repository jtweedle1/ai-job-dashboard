import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 10;

export async function checkRateLimit(uid: string): Promise<{ limited: boolean }> {
  const ref = adminDb.collection("rateLimits").doc(uid);
  const now = Date.now();
  const windowStart = now - WINDOW_SECONDS * 1000;

  const result = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();

    // If no record, or record is from a previous window, start fresh
    if (!data || data.windowStart.toMillis() < windowStart) {
      tx.set(ref, {
        count: 1,
        windowStart: Timestamp.fromMillis(now),
      });
      return { limited: false };
    }

    // Within the current window
    if (data.count >= MAX_REQUESTS) {
      return { limited: true };
    }

    tx.update(ref, { count: FieldValue.increment(1) });
    return { limited: false };
  });

  return result;
}
