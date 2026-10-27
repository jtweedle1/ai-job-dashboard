export interface CoverLetter {
  id: string;
  jobId: string;
  resumeId: string;
  content: string;
  // True once the user has edited the AI draft by hand.
  edited: boolean;
  // Opt-in: only letters the user marks are used to learn their writing voice.
  useAsVoiceSample: boolean;
  createdAt: Date;
}
