import { doc, getDoc, writeBatch, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { buildDemoDocs } from "./demo-data";

function toFirestore(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v instanceof Date ? Timestamp.fromDate(v) : v])
  );
}

// Fills a fresh demo account with the sample job search. Safe to call again; it skips seeded accounts.
export async function seedDemoAccount(uid: string): Promise<void> {
  const userRef = doc(db, "users", uid);
  if ((await getDoc(userRef)).exists()) return;

  const batch = writeBatch(db);
  for (const d of buildDemoDocs(new Date())) {
    const ref = d.collection ? doc(db, "users", uid, d.collection, d.id) : userRef;
    batch.set(ref, toFirestore(d.data));
  }
  await batch.commit();
}
