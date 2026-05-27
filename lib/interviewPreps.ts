import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { InterviewPrep } from "@/types/interviewPrep";

function toPrep(id: string, d: Record<string, unknown>): InterviewPrep {
  return {
    id,
    jobId: d.jobId as string,
    interviewProcess: d.interviewProcess as string,
    mockQuestions: (d.mockQuestions as string[]) ?? [],
    studyTips: (d.studyTips as string) ?? "",
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
  };
}

export async function getInterviewPreps(uid: string): Promise<InterviewPrep[]> {
  const q = query(
    collection(db, "users", uid, "interviewPreps"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPrep(d.id, d.data() as Record<string, unknown>));
}

export async function getInterviewPrepsByJobId(
  uid: string,
  jobId: string
): Promise<InterviewPrep[]> {
  const q = query(
    collection(db, "users", uid, "interviewPreps"),
    where("jobId", "==", jobId)
  );
  const snap = await getDocs(q);
  const preps = snap.docs.map((d) => toPrep(d.id, d.data() as Record<string, unknown>));
  return preps.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function deleteInterviewPrep(uid: string, prepId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "interviewPreps", prepId));
}
