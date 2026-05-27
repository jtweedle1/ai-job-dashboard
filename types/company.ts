export interface Company {
  id: string;
  name: string;
  jobId: string | null;
  whatTheyDo: string | null;
  productSummary: string | null;
  targetCustomers: string | null;
  recentNews: string | null;
  values: string | null;
  competitors: string | null;
  whyInterested: string | null;
  createdAt: Date;
  updatedAt: Date;
}
