export type JobStage =
  | "saved"
  | "applied"
  | "phone_screen"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export type JobSource =
  | "linkedin"
  | "direct"
  | "referral"
  | "recruiter"
  | "wellfound"
  | "niche"
  | "other";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  url: string | null;
  description: string;
  source: JobSource;
  stage: JobStage;
  fitScore: number | null;
  fitReasoning: string | null;
  resumeIdUsed: string | null;
  notes: string | null;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const STAGE_META: Record<JobStage, { label: string; badge: string }> = {
  saved:        { label: "Saved",        badge: "bg-gray-100 text-gray-600" },
  applied:      { label: "Applied",      badge: "bg-blue-50 text-blue-700" },
  phone_screen: { label: "Phone screen", badge: "bg-violet-50 text-violet-700" },
  interview:    { label: "Interview",    badge: "bg-amber-50 text-amber-700" },
  offer:        { label: "Offer",        badge: "bg-emerald-50 text-emerald-700" },
  rejected:     { label: "Rejected",     badge: "bg-red-50 text-red-600" },
  withdrawn:    { label: "Withdrawn",    badge: "bg-slate-100 text-slate-500" },
};

export const SOURCE_LABELS: Record<JobSource, string> = {
  linkedin:  "LinkedIn",
  direct:    "Company site",
  referral:  "Referral",
  recruiter: "Recruiter",
  wellfound: "Wellfound",
  niche:     "Niche board",
  other:     "Other",
};

export const ALL_STAGES = Object.keys(STAGE_META) as JobStage[];
export const ALL_SOURCES = Object.keys(SOURCE_LABELS) as JobSource[];
