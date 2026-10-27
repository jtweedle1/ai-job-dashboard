import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { toLetterClaims } from "./claims";
import type { CoverLetter } from "@/types/coverLetter";

function toCoverLetter(id: string, d: Record<string, unknown>): CoverLetter {
  return {
    id,
    jobId: d.jobId as string,
    resumeId: d.resumeId as string,
    content: d.content as string,
    edited: d.edited === true,
    useAsVoiceSample: d.useAsVoiceSample === true,
    claims: toLetterClaims(d.claims),
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
    where("jobId", "==", jobId)
  );
  const snap = await getDocs(q);
  const letters = snap.docs.map((d) => toCoverLetter(d.id, d.data() as Record<string, unknown>));
  return letters.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function deleteCoverLetter(uid: string, letterId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "coverLetters", letterId));
}

export async function updateCoverLetterContent(
  uid: string,
  letterId: string,
  content: string
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "coverLetters", letterId), {
    content,
    edited: true,
    // The old trace no longer matches the text.
    claims: null,
    updatedAt: serverTimestamp(),
  });
}

export async function setCoverLetterVoiceSample(
  uid: string,
  letterId: string,
  useAsVoiceSample: boolean
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "coverLetters", letterId), { useAsVoiceSample });
}
