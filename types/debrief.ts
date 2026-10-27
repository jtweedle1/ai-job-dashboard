export interface Debrief {
  id: string;
  jobId: string;
  interviewDate: Date;
  whatTheyAsked: string;
  wentWell: string;
  feltWeird: string;
  followUpOpportunities: string;
  answersToImprove: string;
  createdAt: Date;
}

export const DEBRIEF_FIELDS: { key: keyof Omit<Debrief, "id" | "jobId" | "interviewDate" | "createdAt">; label: string; placeholder: string }[] = [
  { key: "whatTheyAsked",         label: "What they asked",          placeholder: "Questions and topics that came up…" },
  { key: "wentWell",              label: "Went well",                placeholder: "Moments you felt confident or connected…" },
  { key: "feltWeird",             label: "Felt weird",               placeholder: "Anything that felt off or you stumbled on…" },
  { key: "followUpOpportunities", label: "Follow-up opportunities",  placeholder: "Things to follow up on with the company…" },
  { key: "answersToImprove",      label: "Answers to improve",       placeholder: "Responses you'd give differently next time…" },
];
