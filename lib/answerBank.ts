import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { AnswerEntry } from "@/types/answerBank";

type CreateAnswerData = Omit<AnswerEntry, "id" | "createdAt" | "updatedAt">;

function toAnswerEntry(id: string, d: Record<string, unknown>): AnswerEntry {
  return {
    id,
    question: (d.question as string) ?? "",
    answer: (d.answer as string) ?? "",
    tags: (d.tags as string[]) ?? [],
    jobId: (d.jobId as string | null) ?? null,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
    updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : new Date(),
  };
}

export async function createAnswer(uid: string, data: CreateAnswerData): Promise<string> {
  const ref = collection(db, "users", uid, "answerBank");
  const docRef = await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getAnswers(uid: string): Promise<AnswerEntry[]> {
  const q = query(
    collection(db, "users", uid, "answerBank"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toAnswerEntry(d.id, d.data() as Record<string, unknown>));
}

export async function updateAnswer(
  uid: string,
  answerId: string,
  patch: Partial<Omit<AnswerEntry, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "answerBank", answerId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAnswer(uid: string, answerId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "answerBank", answerId));
}
