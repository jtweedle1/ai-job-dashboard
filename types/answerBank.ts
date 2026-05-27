export interface AnswerEntry {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  jobId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
