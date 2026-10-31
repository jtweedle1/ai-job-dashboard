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
  | "otta"
  | "hiring_cafe"
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
  // The day of the next interview, if the user has told us (local midnight). Drives "Coming up" on Today.
  nextInterviewAt: Date | null;
  // When the user last chased an application. Restarts the follow-up clock.
  lastFollowUpAt: Date | null;
  // How many times they've chased it. Today stops suggesting follow-ups after FOLLOW_UP_NUDGES.
  followUps: number;
  // The user asked Today to stop suggesting follow-ups for this job.
  followUpsOff: boolean;
  // An optional "apply by" day for a saved role (local midnight), when the posting has one.
  applyBy: Date | null;
  // Today's nudge for this job stays hidden until this moment.
  snoozedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// The stretch of the trail a job is on (DESIGN.md §8): how the Pipeline groups jobs.
export type TrailGroup = "exploring" | "applied" | "talking" | "decided";
// Stage tone: the Trailhead color that marks the stage. Always shown with the label, never alone.
export type StageTone = "stone" | "sky" | "sun" | "moss";

export const TRAIL_GROUPS: { id: TrailGroup; label: string }[] = [
  { id: "exploring", label: "Exploring" },
  { id: "applied", label: "Applied" },
  { id: "talking", label: "Talking" },
  { id: "decided", label: "Decided" },
];

export const STAGE_META: Record<JobStage, { label: string; badge: string; group: TrailGroup; tone: StageTone; hollow?: boolean }> = {
  saved:        { label: "Saved",          badge: "bg-gray-100 text-gray-600",       group: "exploring", tone: "stone", hollow: true },
  applied:      { label: "Applied",        badge: "bg-blue-50 text-blue-700",        group: "applied",   tone: "sky" },
  phone_screen: { label: "Phone screen",   badge: "bg-violet-50 text-violet-700",    group: "talking",   tone: "sun" },
  interview:    { label: "Interview",      badge: "bg-amber-50 text-amber-700",      group: "talking",   tone: "sun" },
  offer:        { label: "Offer",          badge: "bg-emerald-50 text-emerald-700",  group: "decided",   tone: "moss" },
  rejected:     { label: "Not this time",  badge: "bg-red-50 text-red-600",          group: "decided",   tone: "stone" },
  withdrawn:    { label: "Stepped away",   badge: "bg-gray-100 text-gray-500",       group: "decided",   tone: "stone" },
};

export const SOURCE_LABELS: Record<JobSource, string> = {
  linkedin:  "LinkedIn",
  direct:    "Company site",
  referral:  "Referral",
  recruiter: "Recruiter",
  wellfound:    "Wellfound",
  otta:         "Otta",
  hiring_cafe:  "Hiring Cafe",
  niche:        "Niche board",
  other:     "Other",
};

export const ALL_STAGES = Object.keys(STAGE_META) as JobStage[];
export const ALL_SOURCES = Object.keys(SOURCE_LABELS) as JobSource[];

// Filters that cover more than one stage, used by Today's trail links (/applications?stage=interviewing).
export const STAGE_GROUPS = {
  interviewing: { label: "Interviewing", stages: ["phone_screen", "interview"] },
  closed: { label: "Closed", stages: ["rejected", "withdrawn"] },
} as const satisfies Record<string, { label: string; stages: JobStage[] }>;

export type StageGroup = keyof typeof STAGE_GROUPS;
export type StageFilter = JobStage | StageGroup;

export function isStageFilter(value: string | null): value is StageFilter {
  return value != null && (value in STAGE_META || value in STAGE_GROUPS);
}

export function matchesStageFilter(stage: JobStage, filter: StageFilter): boolean {
  return filter in STAGE_GROUPS
    ? (STAGE_GROUPS[filter as StageGroup].stages as readonly JobStage[]).includes(stage)
    : stage === filter;
}
