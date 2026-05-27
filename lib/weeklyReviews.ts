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
import type { WeeklyReview } from "@/types/weeklyReview";

type CreateReviewData = Omit<WeeklyReview, "id" | "createdAt" | "updatedAt">;

function toWeeklyReview(id: string, d: Record<string, unknown>): WeeklyReview {
  return {
    id,
    weekOf: d.weekOf instanceof Timestamp ? d.weekOf.toDate() : new Date(),
    applicationsSent: (d.applicationsSent as number) ?? 0,
    interviewsBooked: (d.interviewsBooked as number) ?? 0,
    responsesReceived: (d.responsesReceived as number) ?? 0,
    bestResumeVersion: (d.bestResumeVersion as string) ?? "",
    rolesToDeprioritize: (d.rolesToDeprioritize as string) ?? "",
    nextWeekFocus: (d.nextWeekFocus as string) ?? "",
    aiSummary: (d.aiSummary as string | null) ?? null,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
    updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : new Date(),
  };
}

export async function createReview(uid: string, data: CreateReviewData): Promise<string> {
  const ref = collection(db, "users", uid, "weeklyReviews");
  const docRef = await addDoc(ref, {
    ...data,
    weekOf: Timestamp.fromDate(data.weekOf),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getReviews(uid: string): Promise<WeeklyReview[]> {
  const q = query(
    collection(db, "users", uid, "weeklyReviews"),
    orderBy("weekOf", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toWeeklyReview(d.id, d.data() as Record<string, unknown>));
}

export async function updateReview(
  uid: string,
  reviewId: string,
  patch: Partial<Omit<WeeklyReview, "id" | "createdAt">>
): Promise<void> {
  const data: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() };
  if (patch.weekOf) data.weekOf = Timestamp.fromDate(patch.weekOf);
  await updateDoc(doc(db, "users", uid, "weeklyReviews", reviewId), data);
}

export async function deleteReview(uid: string, reviewId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "weeklyReviews", reviewId));
}
