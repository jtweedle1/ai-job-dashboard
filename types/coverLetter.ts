export interface CoverLetter {
  id: string;
  jobId: string;
  resumeId: string;
  content: string;
  // True once the user has edited the AI draft by hand.
  edited: boolean;
  // Opt-in: only letters the user marks are used to learn their writing voice.
  useAsVoiceSample: boolean;
  // Where each claim came from. null until checked, and again after a hand edit.
  claims: LetterClaim[] | null;
  createdAt: Date;
}

// One factual claim a letter makes about the candidate, and the material that backs it.
export interface LetterClaim {
  // Copied exactly from the letter.
  quote: string;
  // Label of the backing material ("Your resume", a background answer), or null if nothing backs it.
  source: string | null;
  // Copied exactly from that material.
  evidence: string | null;
}
