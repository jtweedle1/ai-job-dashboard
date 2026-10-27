export type WritingSampleKind = "cover_letter" | "other";

export interface WritingSample {
  id: string;
  label: string;
  content: string;
  kind: WritingSampleKind;
  // Excluded samples stay saved but are ignored by the voice profile and cover letters.
  included: boolean;
  createdAt: Date;
}

// "full" includes a greeting and sign-off; "body" is just the paragraphs.
export type LetterFormat = "full" | "body";

export interface VoiceSettings {
  // null = match the length of the user's own samples.
  targetWords: number | null;
  format: LetterFormat;
  // Stories, projects, or values the user wants woven in when relevant. Treated as true facts.
  alwaysMention: string;
  // How the user wants every letter written (structure, tone, rules). Passed to the model as written.
  guidelines: string;
  // Words or phrases the user never wants in a letter. Also checked in code after generation.
  neverSay: string;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  targetWords: null,
  format: "full",
  alwaysMention: "",
  guidelines: "",
  neverSay: "",
};

export function toVoiceSettings(d: unknown): VoiceSettings {
  const v = (d ?? {}) as Record<string, unknown>;
  const target = typeof v.targetWords === "number" && v.targetWords > 0 ? Math.round(v.targetWords) : null;
  return {
    targetWords: target,
    format: v.format === "body" ? "body" : "full",
    alwaysMention: typeof v.alwaysMention === "string" ? v.alwaysMention : "",
    guidelines: typeof v.guidelines === "string" ? v.guidelines : "",
    neverSay: typeof v.neverSay === "string" ? v.neverSay : "",
  };
}
