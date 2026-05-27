import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Job, JobStage, JobSource } from "@/types/job";

type CreateJobData = Omit<Job, "id" | "createdAt" | "updatedAt" | "fitScore" | "fitReasoning" | "resumeIdUsed">;

function toJob(id: string, d: Record<string, unknown>): Job {
  return {
    id,
    title: d.title as string,
    company: d.company as string,
    location: (d.location as string | null) ?? null,
    salary: (d.salary as string | null) ?? null,
    url: (d.url as string | null) ?? null,
    description: (d.description as string) ?? "",
    source: (d.source as JobSource) ?? "other",
    stage: (d.stage as JobStage) ?? "saved",
    fitScore: (d.fitScore as number | null) ?? null,
    fitReasoning: (d.fitReasoning as string | null) ?? null,
    resumeIdUsed: (d.resumeIdUsed as string | null) ?? null,
    notes: (d.notes as string | null) ?? null,
    appliedAt: d.appliedAt instanceof Timestamp ? d.appliedAt.toDate() : null,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
    updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : new Date(),
  };
}

export async function createJob(uid: string, data: CreateJobData): Promise<string> {
  const ref = collection(db, "users", uid, "jobs");
  const docRef = await addDoc(ref, {
    ...data,
    fitScore: null,
    fitReasoning: null,
    resumeIdUsed: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getJobs(uid: string): Promise<Job[]> {
  const q = query(collection(db, "users", uid, "jobs"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toJob(d.id, d.data() as Record<string, unknown>));
}

export async function getJob(uid: string, jobId: string): Promise<Job | null> {
  const snap = await getDoc(doc(db, "users", uid, "jobs", jobId));
  if (!snap.exists()) return null;
  return toJob(snap.id, snap.data() as Record<string, unknown>);
}

export async function updateJob(
  uid: string,
  jobId: string,
  data: Partial<Omit<Job, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "jobs", jobId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteJob(uid: string, jobId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "jobs", jobId));
}
