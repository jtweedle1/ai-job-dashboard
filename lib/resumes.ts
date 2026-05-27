import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Resume } from "@/types/resume";

export async function createResume(
  uid: string,
  label: string,
  content: string,
  fileUrl: string | null = null
): Promise<string> {
  const ref = collection(db, "users", uid, "resumes");
  const docRef = await addDoc(ref, {
    label,
    content,
    fileUrl,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getResumes(uid: string): Promise<Resume[]> {
  const ref = collection(db, "users", uid, "resumes");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    label: d.data().label,
    content: d.data().content,
    fileUrl: d.data().fileUrl ?? null,
    createdAt: d.data().createdAt?.toDate() ?? new Date(),
  }));
}

export async function deleteResume(uid: string, resumeId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "resumes", resumeId));
}

export async function setActiveResume(uid: string, resumeId: string | null): Promise<void> {
  await updateDoc(doc(db, "users", uid), { activeResumeId: resumeId });
}
