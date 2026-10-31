import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Job, JobStage, JobSource } from "@/types/job";

type CreateJobData = Omit<
  Job,
  "id" | "createdAt" | "updatedAt" | "fitScore" | "fitReasoning" | "resumeIdUsed" | "nextInterviewAt" | "lastFollowUpAt" | "snoozedUntil" | "followUps" | "followUpsOff" | "applyBy"
>;

function toDate(v: unknown): Date | null {
  return v instanceof Timestamp ? v.toDate() : null;
}

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
    appliedAt: toDate(d.appliedAt),
    // Added later; older jobs simply don't have these fields.
    nextInterviewAt: toDate(d.nextInterviewAt),
    lastFollowUpAt: toDate(d.lastFollowUpAt),
    snoozedUntil: toDate(d.snoozedUntil),
    // Jobs chased before the count existed have been chased at least once.
    followUps: (d.followUps as number | undefined) ?? (d.lastFollowUpAt ? 1 : 0),
    followUpsOff: (d.followUpsOff as boolean | undefined) ?? false,
    applyBy: toDate(d.applyBy),
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
    nextInterviewAt: null,
    lastFollowUpAt: null,
    snoozedUntil: null,
    followUps: 0,
    followUpsOff: false,
    applyBy: null,
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

// The work made for one job: it goes when the job goes. Companies and saved Answers stay; they
// stand on their own, so a company just loses its link to the role.
const OWNED_BY_JOB = ["coverLetters", "interviewPreps", "debriefs"] as const;
// Firestore caps a write batch at 500 operations.
const BATCH_LIMIT = 500;

export async function deleteJob(uid: string, jobId: string): Promise<void> {
  const snaps = await Promise.all(
    [...OWNED_BY_JOB, "companies"].map((name) =>
      getDocs(query(collection(db, "users", uid, name), where("jobId", "==", jobId)))
    )
  );
  const companies = snaps.pop()!;
  const owned = snaps.flatMap((s) => s.docs.map((d) => d.ref));

  // The job itself goes in the last batch, so if anything fails partway the job is still there to retry.
  for (let i = 0; i < owned.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const ref of owned.slice(i, i + BATCH_LIMIT)) batch.delete(ref);
    await batch.commit();
  }
  const last = writeBatch(db);
  for (const c of companies.docs) last.update(c.ref, { jobId: null });
  last.delete(doc(db, "users", uid, "jobs", jobId));
  await last.commit();
}
