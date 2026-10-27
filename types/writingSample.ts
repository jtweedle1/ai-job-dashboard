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
