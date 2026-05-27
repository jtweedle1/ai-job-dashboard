export interface WeeklyReview {
  id: string;
  weekOf: Date;
  applicationsSent: number;
  interviewsBooked: number;
  responsesReceived: number;
  bestResumeVersion: string;
  rolesToDeprioritize: string;
  nextWeekFocus: string;
  aiSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
}
