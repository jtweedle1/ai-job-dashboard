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
  where,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Company } from "@/types/company";

function toCompany(id: string, d: Record<string, unknown>): Company {
  return {
    id,
    name: d.name as string,
    jobId: (d.jobId as string | null) ?? null,
    whatTheyDo: (d.whatTheyDo as string | null) ?? null,
    productSummary: (d.productSummary as string | null) ?? null,
    targetCustomers: (d.targetCustomers as string | null) ?? null,
    recentNews: (d.recentNews as string | null) ?? null,
    values: (d.values as string | null) ?? null,
    competitors: (d.competitors as string | null) ?? null,
    whyInterested: (d.whyInterested as string | null) ?? null,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
    updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : new Date(),
  };
}

export async function createCompany(
  uid: string,
  data: Pick<Company, "name" | "jobId">
): Promise<string> {
  const ref = collection(db, "users", uid, "companies");
  const docRef = await addDoc(ref, {
    name: data.name,
    jobId: data.jobId ?? null,
    whatTheyDo: null,
    productSummary: null,
    targetCustomers: null,
    recentNews: null,
    values: null,
    competitors: null,
    whyInterested: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getCompanies(uid: string): Promise<Company[]> {
  const q = query(
    collection(db, "users", uid, "companies"),
    orderBy("updatedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toCompany(d.id, d.data() as Record<string, unknown>));
}

export async function getCompany(uid: string, companyId: string): Promise<Company | null> {
  const snap = await getDoc(doc(db, "users", uid, "companies", companyId));
  if (!snap.exists()) return null;
  return toCompany(snap.id, snap.data() as Record<string, unknown>);
}

export async function getCompanyByName(uid: string, name: string): Promise<Company | null> {
  const q = query(
    collection(db, "users", uid, "companies"),
    where("name", "==", name),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toCompany(snap.docs[0].id, snap.docs[0].data() as Record<string, unknown>);
}

export async function getCompanyByJobId(uid: string, jobId: string): Promise<Company | null> {
  const q = query(
    collection(db, "users", uid, "companies"),
    where("jobId", "==", jobId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toCompany(snap.docs[0].id, snap.docs[0].data() as Record<string, unknown>);
}

export async function updateCompany(
  uid: string,
  companyId: string,
  data: Partial<Omit<Company, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "companies", companyId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCompany(uid: string, companyId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "companies", companyId));
}
