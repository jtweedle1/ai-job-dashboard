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
import { toBackgroundAnswers } from "@/types/background";
import type { Background } from "@/types/background";

export type BackgroundInput = Pick<Background, "title" | "company" | "startDate" | "endDate" | "answers">;

function toBackground(id: string, d: Record<string, unknown>): Background {
  const createdAt = d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date();
  return {
    id,
    title: (d.title as string) ?? "",
    company: (d.company as string) ?? "",
    startDate: (d.startDate as string) ?? "",
    endDate: (d.endDate as string) ?? "",
    answers: toBackgroundAnswers(d.answers),
    included: d.included !== false,
    createdAt,
    updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : createdAt,
  };
}

export async function getBackgrounds(uid: string): Promise<Background[]> {
  const q = query(collection(db, "users", uid, "backgrounds"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toBackground(d.id, d.data() as Record<string, unknown>));
}

export async function createBackground(uid: string, data: BackgroundInput): Promise<string> {
  const docRef = await addDoc(collection(db, "users", uid, "backgrounds"), {
    ...data,
    included: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateBackground(uid: string, id: string, data: BackgroundInput): Promise<void> {
  await updateDoc(doc(db, "users", uid, "backgrounds", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function setBackgroundIncluded(uid: string, id: string, included: boolean): Promise<void> {
  await updateDoc(doc(db, "users", uid, "backgrounds", id), { included });
}

export async function deleteBackground(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "backgrounds", id));
}
