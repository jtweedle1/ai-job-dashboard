import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { toVoiceSettings } from "@/types/writingSample";
import type { WritingSample, VoiceSettings } from "@/types/writingSample";

type CreateSampleData = Omit<WritingSample, "id" | "createdAt">;

function toWritingSample(id: string, d: Record<string, unknown>): WritingSample {
  return {
    id,
    label: (d.label as string) ?? "",
    content: (d.content as string) ?? "",
    kind: d.kind === "cover_letter" ? "cover_letter" : "other",
    included: d.included !== false,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
  };
}

export async function createWritingSample(uid: string, data: CreateSampleData): Promise<string> {
  const ref = collection(db, "users", uid, "writingSamples");
  const docRef = await addDoc(ref, { ...data, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function getWritingSamples(uid: string): Promise<WritingSample[]> {
  const q = query(
    collection(db, "users", uid, "writingSamples"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toWritingSample(d.id, d.data() as Record<string, unknown>));
}

export async function setWritingSampleIncluded(
  uid: string,
  sampleId: string,
  included: boolean
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "writingSamples", sampleId), { included });
}

export async function deleteWritingSample(uid: string, sampleId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "writingSamples", sampleId));
}

export interface VoiceProfile {
  content: string;
  updatedAt: Date | null;
  settings: VoiceSettings;
}

// The voice profile lives on the user doc so the cover letter route can read it in one get.
export async function getVoiceProfile(uid: string): Promise<VoiceProfile> {
  const snap = await getDoc(doc(db, "users", uid));
  const d = snap.data() ?? {};
  return {
    content: (d.voiceProfile as string) ?? "",
    updatedAt:
      d.voiceProfileUpdatedAt instanceof Timestamp ? d.voiceProfileUpdatedAt.toDate() : null,
    settings: toVoiceSettings(d.voiceSettings),
  };
}

export async function saveVoiceProfile(uid: string, content: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    voiceProfile: content,
    voiceProfileUpdatedAt: serverTimestamp(),
  });
}

export async function saveVoiceSettings(uid: string, settings: VoiceSettings): Promise<void> {
  await updateDoc(doc(db, "users", uid), { voiceSettings: settings });
}
