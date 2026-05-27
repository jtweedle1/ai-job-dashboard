import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { CoverLetter } from "@/types/coverLetter";

function toCoverLetter(id: string, d: Record<string, unknown>): CoverLetter {
  return {
    id,
    jobId: d.jobId as string,
    resumeId: d.resumeId as string,
    content: d.content as string,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
  };
}

export async function getCoverLetters(uid: string): Promise<CoverLetter[]> {
  const q = query(
    collection(db, "users", uid, "coverLetters"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toCoverLetter(d.id, d.data() as Record<string, unknown>));
}

export async function getCoverLettersByJobId(uid: string, jobId: string): Promise<CoverLetter[]> {
  const q = query(
    collection(db, "users", uid, "coverLetters"),
    where("jobId", "==", jobId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toCoverLetter(d.id, d.data() as Record<string, unknown>));
}

export async function deleteCoverLetter(uid: string, letterId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "coverLetters", letterId));
}
