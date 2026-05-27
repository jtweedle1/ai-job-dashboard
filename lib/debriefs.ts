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
import type { Debrief } from "@/types/debrief";

type CreateDebriefData = Omit<Debrief, "id" | "createdAt">;

function toDebrief(id: string, d: Record<string, unknown>): Debrief {
  return {
    id,
    jobId: d.jobId as string,
    interviewDate: d.interviewDate instanceof Timestamp ? d.interviewDate.toDate() : new Date(),
    whatTheyAsked: (d.whatTheyAsked as string) ?? "",
    wentWell: (d.wentWell as string) ?? "",
    feltWeird: (d.feltWeird as string) ?? "",
    followUpOpportunities: (d.followUpOpportunities as string) ?? "",
    answersToImprove: (d.answersToImprove as string) ?? "",
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
  };
}

export async function createDebrief(uid: string, data: CreateDebriefData): Promise<string> {
  const ref = collection(db, "users", uid, "debriefs");
  const docRef = await addDoc(ref, {
    ...data,
    interviewDate: Timestamp.fromDate(data.interviewDate),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getDebriefs(uid: string): Promise<Debrief[]> {
  const q = query(
    collection(db, "users", uid, "debriefs"),
    orderBy("interviewDate", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toDebrief(d.id, d.data() as Record<string, unknown>));
}

export async function getDebriefsByJobId(uid: string, jobId: string): Promise<Debrief[]> {
  const q = query(
    collection(db, "users", uid, "debriefs"),
    where("jobId", "==", jobId)
  );
  const snap = await getDocs(q);
  const debriefs = snap.docs.map((d) => toDebrief(d.id, d.data() as Record<string, unknown>));
  return debriefs.sort((a, b) => b.interviewDate.getTime() - a.interviewDate.getTime());
}

export async function deleteDebrief(uid: string, debriefId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "debriefs", debriefId));
}
