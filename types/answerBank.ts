export interface AnswerEntry {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  jobId: string | null;
  // Opt-in: only answers the user marks are used to learn their writing voice.
  useAsVoiceSample: boolean;
  createdAt: Date;
  updatedAt: Date;
}
