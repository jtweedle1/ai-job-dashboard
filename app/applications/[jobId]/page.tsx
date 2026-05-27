"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getJob, updateJob, deleteJob } from "@/lib/jobs";
import { getCompanyByJobId, createCompany } from "@/lib/companies";
import { getCoverLettersByJobId } from "@/lib/coverLetters";
import { getInterviewPrepsByJobId } from "@/lib/interviewPreps";
import EditableField from "@/components/EditableField";
import {
  STAGE_META,
  SOURCE_LABELS,
  ALL_STAGES,
  ALL_SOURCES,
  type Job,
  type JobStage,
  type JobSource,
} from "@/types/job";
import type { Company } from "@/types/company";
import type { CoverLetter } from "@/types/coverLetter";
import type { InterviewPrep } from "@/types/interviewPrep";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StageBadge({ stage }: { stage: JobStage }) {
  const meta = STAGE_META[stage];
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${meta.badge}`}>
      {meta.label}
    </span>
  );
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [interviewPreps, setInterviewPreps] = useState<InterviewPrep[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getJob(user.uid, jobId),
      getCompanyByJobId(user.uid, jobId),
      getCoverLettersByJobId(user.uid, jobId),
      getInterviewPrepsByJobId(user.uid, jobId),
    ]).then(([j, c, cl, ip]) => {
      if (!j) setNotFound(true);
      else setJob(j);
      setCompany(c);
      setCoverLetters(cl);
      setInterviewPreps(ip);
      setLoading(false);
    });
  }, [user, jobId]);

  const save = useCallback(
    async (patch: Partial<Omit<Job, "id" | "createdAt">>) => {
      if (!user || !job) return;
      setJob((prev) => (prev ? { ...prev, ...patch } : prev));
      await updateJob(user.uid, jobId, patch);
    },
    [user, job, jobId]
  );

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function handleStageChange(stage: JobStage) {
    const patch: Partial<Job> = { stage };
    if (stage === "applied" && !job?.appliedAt) patch.appliedAt = new Date();
    await save(patch);
    showToast("Stage updated");
  }

  async function handleSourceChange(source: JobSource) {
    await save({ source });
    showToast("Source updated");
  }

  async function handleScore() {
    if (!user) return;
    setScoring(true);
    setScoreError("");
    try {
      const res = await fetch("/api/fit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, jobId }),
      });
      const data = await res.json();
      if (res.status === 401 || data.error === "no_key") {
        setScoreError("Add your Anthropic API key in Settings to score roles.");
        return;
      }
      if (data.error === "no_resume") {
        setScoreError("Add a resume in the Resumes section first.");
        return;
      }
      if (data.error) {
        setScoreError("Scoring failed. Try again.");
        return;
      }
      setJob((prev) => prev ? { ...prev, fitScore: data.score, fitReasoning: data.reasoning } : prev);
      showToast("Fit score updated");
    } catch {
      setScoreError("Something went wrong. Try again.");
    } finally {
      setScoring(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    setDeleting(true);
    await deleteJob(user.uid, jobId);
    router.push("/applications");
  }

  async function handleCreateCompany() {
    if (!user || !job) return;
    setCreatingCompany(true);
    try {
      const id = await createCompany(user.uid, { name: job.company, jobId: job.id });
      const newCompany: Company = {
        id,
        name: job.company,
        jobId: job.id,
        whatTheyDo: null,
        productSummary: null,
        targetCustomers: null,
        recentNews: null,
        values: null,
        competitors: null,
        whyInterested: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setCompany(newCompany);
      router.push(`/companies/${id}`);
    } finally {
      setCreatingCompany(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-7 bg-gray-100 rounded w-64" />
        <div className="h-4 bg-gray-100 rounded w-40" />
        <div className="h-32 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center pt-20">
        <p className="text-sm text-gray-500 mb-4">Job not found.</p>
        <button
          onClick={() => router.push("/applications")}
          className="text-sm text-emerald-600 hover:underline"
        >
          Back to applications
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
          <i className="ti ti-circle-check text-emerald-400 text-base" aria-hidden="true" />
          {toast}
        </div>
      )}

      {/* Back */}
      <button
        onClick={() => router.push("/applications")}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-5"
      >
        <i className="ti ti-arrow-left text-sm" aria-hidden="true" />
        Applications
      </button>

      {/* Title + actions */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 mb-0.5">{job.title}</h1>
          <p className="text-sm text-gray-500">{job.company}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {deleteConfirm ? (
            <>
              <span className="text-xs text-gray-500">Delete this job?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="text-gray-300 hover:text-red-400 transition-colors"
              aria-label="Delete job"
            >
              <i className="ti ti-trash text-sm" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Stage + source */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Stage</label>
          <select
            value={job.stage}
            onChange={(e) => handleStageChange(e.target.value as JobStage)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {ALL_STAGES.map((s) => (
              <option key={s} value={s}>{STAGE_META[s].label}</option>
            ))}
          </select>
        </div>
        <StageBadge stage={job.stage} />
        <div className="flex items-center gap-2 ml-2">
          <label className="text-xs text-gray-500">Source</label>
          <select
            value={job.source}
            onChange={(e) => handleSourceChange(e.target.value as JobSource)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {ALL_SOURCES.map((s) => (
              <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white border border-gray-100 rounded-xl mb-4">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Details</p>
        </div>
        <div className="divide-y divide-gray-50">
          {(
            [
              { label: "Title",    value: job.title,    key: "title" },
              { label: "Company",  value: job.company,  key: "company" },
              { label: "Location", value: job.location, key: "location", placeholder: "Add location" },
              { label: "Salary",   value: job.salary,   key: "salary",   placeholder: "Add salary range" },
            ] as { label: string; value: string | null; key: keyof Job; placeholder?: string }[]
          ).map(({ label, value, key, placeholder }) => (
            <div key={key} className="flex items-center gap-4 px-4">
              <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
              <div className="flex-1 py-1">
                <EditableField
                  value={value}
                  placeholder={placeholder ?? "—"}
                  onSave={(v) => save({ [key]: v || null })}
                />
              </div>
            </div>
          ))}
          <div className="flex items-center gap-4 px-4">
            <span className="text-xs text-gray-400 w-20 shrink-0">URL</span>
            <div className="flex-1 py-1 flex items-center gap-2">
              <EditableField
                value={job.url}
                placeholder="Add job URL"
                onSave={(v) => save({ url: v || null })}
                className="flex-1"
              />
              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-700 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <i className="ti ti-external-link text-sm" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
          {job.appliedAt && (
            <div className="flex items-center gap-4 px-4 py-2.5">
              <span className="text-xs text-gray-400 w-20 shrink-0">Applied</span>
              <span className="text-sm text-gray-600">{formatDate(job.appliedAt)}</span>
            </div>
          )}
          <div className="flex items-center gap-4 px-4 py-2.5">
            <span className="text-xs text-gray-400 w-20 shrink-0">Added</span>
            <span className="text-sm text-gray-500">{formatDate(job.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Company profile */}
      <div className="bg-white border border-gray-100 rounded-xl mb-4">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Company profile</p>
        </div>
        {company ? (
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{company.name}</p>
              {company.whatTheyDo && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{company.whatTheyDo}</p>
              )}
            </div>
            <button
              onClick={() => router.push(`/companies/${company.id}`)}
              className="text-xs text-emerald-600 hover:underline shrink-0 ml-4"
            >
              View profile
            </button>
          </div>
        ) : (
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-400">No company profile yet.</p>
            <button
              onClick={handleCreateCompany}
              disabled={creatingCompany}
              className="text-xs text-emerald-600 hover:underline disabled:opacity-50"
            >
              {creatingCompany ? "Creating…" : "Create profile"}
            </button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white border border-gray-100 rounded-xl mb-4">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Notes</p>
        </div>
        <div className="px-4 py-2">
          <EditableField
            value={job.notes}
            placeholder="Add notes about this role…"
            multiline
            onSave={(v) => save({ notes: v || null })}
          />
        </div>
      </div>

      {/* Job description */}
      <div className="bg-white border border-gray-100 rounded-xl mb-4">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Job description</p>
        </div>
        <div className="px-4 py-2">
          <EditableField
            value={job.description || null}
            placeholder="Paste the job description…"
            multiline
            onSave={(v) => save({ description: v })}
          />
        </div>
      </div>

      {/* Fit score */}
      <div className="bg-white border border-gray-100 rounded-xl mb-4">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Fit score</p>
          <button
            onClick={handleScore}
            disabled={scoring}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
          >
            {scoring ? (
              <i className="ti ti-loader-2 animate-spin text-xs" aria-hidden="true" />
            ) : (
              <i className="ti ti-refresh text-xs" aria-hidden="true" />
            )}
            {scoring ? "Scoring…" : job.fitScore != null ? "Recalculate" : "Score this role"}
          </button>
        </div>
        <div className="px-4 py-3">
          {job.fitScore != null ? (
            <div className="flex items-start gap-3">
              <span className={`text-2xl font-semibold shrink-0 ${
                job.fitScore >= 80
                  ? "text-emerald-600"
                  : job.fitScore >= 60
                  ? "text-amber-500"
                  : "text-red-500"
              }`}>
                {job.fitScore}
              </span>
              <div>
                <div className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mb-1.5 ${
                  job.fitScore >= 80
                    ? "bg-emerald-50 text-emerald-700"
                    : job.fitScore >= 60
                    ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-600"
                }`}>
                  {job.fitScore >= 80 ? "Strong fit" : job.fitScore >= 60 ? "Moderate fit" : "Weak fit"}
                </div>
                {job.fitReasoning && (
                  <p className="text-sm text-gray-600 leading-relaxed">{job.fitReasoning}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              {scoreError
                ? <span className="text-amber-600">{scoreError}</span>
                : "Score this role to see how well your resume matches the job description."}
            </p>
          )}
          {scoreError && job.fitScore != null && (
            <p className="text-xs text-amber-600 mt-2">{scoreError}</p>
          )}
        </div>
      </div>

      {/* Linked resources */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Cover letter — live */}
        <button
          onClick={() => router.push(`/cover-letters?jobId=${jobId}`)}
          className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center text-center gap-2 hover:border-gray-200 hover:shadow-sm transition-all"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <i className="ti ti-mail text-emerald-600 text-base" aria-hidden="true" />
          </div>
          <p className="text-xs font-medium text-gray-600">Cover letter</p>
          {coverLetters.length > 0 ? (
            <p className="text-xs text-emerald-600">
              {coverLetters.length} letter{coverLetters.length !== 1 ? "s" : ""} →
            </p>
          ) : (
            <p className="text-xs text-gray-400">Generate →</p>
          )}
        </button>

        {/* Interview prep — live */}
        <button
          onClick={() => router.push(`/interview-prep?jobId=${jobId}`)}
          className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center text-center gap-2 hover:border-gray-200 hover:shadow-sm transition-all"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <i className="ti ti-microphone text-emerald-600 text-base" aria-hidden="true" />
          </div>
          <p className="text-xs font-medium text-gray-600">Interview prep</p>
          {interviewPreps.length > 0 ? (
            <p className="text-xs text-emerald-600">
              {interviewPreps.length} session{interviewPreps.length !== 1 ? "s" : ""} →
            </p>
          ) : (
            <p className="text-xs text-gray-400">Generate →</p>
          )}
        </button>

        {/* Debriefs stub */}
        {[
          { icon: "ti-clipboard-list", label: "Debriefs", phase: 10 },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center text-center gap-2 opacity-60"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
              <i className={`ti ${item.icon} text-gray-400 text-base`} aria-hidden="true" />
            </div>
            <p className="text-xs font-medium text-gray-600">{item.label}</p>
            <p className="text-xs text-gray-400">Coming in phase {item.phase}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
