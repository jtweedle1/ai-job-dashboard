"use client";

import { Suspense, use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authedFetch, noKeyMessage } from "@/lib/api-client";
import { aiErrorMessage } from "@/lib/ai-errors";
import { getJob, updateJob, deleteJob } from "@/lib/jobs";
import { getCompanyByJobId, createCompany } from "@/lib/companies";
import { getResumes } from "@/lib/resumes";
import { getCoverLettersByJobId } from "@/lib/coverLetters";
import { getInterviewPrepsByJobId } from "@/lib/interviewPreps";
import { getDebriefsByJobId } from "@/lib/debriefs";
import { JOB_STEPS, isStep, stepsDone, suggestedStep, type JobActivity, type JobStep } from "@/lib/next-steps";
import EditableField from "@/components/EditableField";
import Toast from "@/components/Toast";
import CoverLetterPanel from "@/components/job/CoverLetterPanel";
import InterviewPrepPanel from "@/components/job/InterviewPrepPanel";
import DebriefPanel from "@/components/job/DebriefPanel";
import InterviewDateField from "@/components/job/InterviewDateField";
import {
  STAGE_META, SOURCE_LABELS, ALL_STAGES, ALL_SOURCES,
  type Job, type JobStage, type JobSource,
} from "@/types/job";
import type { Company } from "@/types/company";
import type { Resume } from "@/types/resume";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const selectClass =
  "border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white/80 dark:bg-gray-800 dark:text-gray-100";

function StepRail({
  current,
  done,
  onSelect,
}: {
  current: JobStep;
  done: Record<JobStep, boolean>;
  onSelect: (step: JobStep) => void;
}) {
  return (
    <nav aria-label="Steps for this job" className="mb-6 -mx-1 overflow-x-auto">
      <ol className="flex items-center gap-1 px-1 min-w-max">
        {JOB_STEPS.map((s, i) => {
          const active = s.id === current;
          return (
            <li key={s.id} className="flex items-center gap-1">
              {i > 0 && <span className="w-4 sm:w-6 h-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />}
              <button
                onClick={() => onSelect(s.id)}
                aria-current={active ? "step" : undefined}
                className={`flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full text-sm font-display font-bold transition-all ${
                  active
                    ? "glow-gradient text-gray-900 dark:text-white shadow-sm shadow-gray-900/5"
                    : "text-gray-500 dark:text-gray-400 hover:bg-white/70 dark:hover:bg-white/5"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${
                    active
                      ? "bg-white/80 dark:bg-white/15"
                      : done[s.id]
                      ? "bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300"
                      : "bg-white/70 dark:bg-white/5"
                  }`}
                >
                  <i className={`ti ${done[s.id] && !active ? "ti-check" : s.icon}`} aria-hidden="true" />
                </span>
                {s.label}
                {done[s.id] && <span className="sr-only">(done)</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Nudge({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-3 flex-wrap px-5 py-3 rounded-3xl glow-gradient">
      <p className="text-sm text-gray-800 dark:text-gray-100 flex-1 min-w-[12rem]">{text}</p>
      <button
        onClick={onClick}
        className="text-sm font-medium bg-white/90 dark:bg-white/15 text-gray-900 dark:text-white px-4 py-1.5 rounded-full hover:bg-white dark:hover:bg-white/25 transition-colors"
      >
        {action}
      </button>
    </div>
  );
}

const OUTCOMES: { stage: JobStage; label: string; icon: string; blurb: string }[] = [
  { stage: "offer", label: "Got an offer", icon: "ti-confetti", blurb: "Well earned." },
  { stage: "rejected", label: "Not this time", icon: "ti-cloud-rain", blurb: "It happens to everyone. Your notes still count." },
  { stage: "withdrawn", label: "I stepped away", icon: "ti-door-exit", blurb: "Knowing when to walk away is a skill." },
];

interface ToastState {
  message: string;
  tone?: "done" | "error";
}

function JobWorkspace({ jobId }: { jobId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [job, setJob] = useState<Job | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [activity, setActivity] = useState<JobActivity>({ letters: 0, preps: 0, debriefs: 0 });
  const [step, setStep] = useState<JobStep>("decide");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const [toast, setToast] = useState<ToastState>({ message: "" });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getJob(user.uid, jobId),
      getCompanyByJobId(user.uid, jobId),
      getResumes(user.uid),
      getCoverLettersByJobId(user.uid, jobId),
      getInterviewPrepsByJobId(user.uid, jobId),
      getDebriefsByJobId(user.uid, jobId),
    ]).then(([j, c, r, cl, ip, db]) => {
      const a = { letters: cl.length, preps: ip.length, debriefs: db.length };
      if (!j) setNotFound(true);
      else {
        setJob(j);
        const asked = searchParams.get("step");
        setStep(isStep(asked) ? asked : suggestedStep(j, a));
      }
      setCompany(c);
      setResumes(r);
      setActivity(a);
      setLoading(false);
    });
    // The step param only picks the starting step; later changes come from goTo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, jobId]);

  const showToast = useCallback((message: string, tone: ToastState["tone"] = "done") => {
    setToast({ message, tone });
    setTimeout(() => setToast({ message: "" }), tone === "error" ? 5000 : 2500);
  }, []);

  // Shows the change at once, then saves it. If the save fails the old value comes back, so the
  // page never shows something that isn't stored. Resolves true when the change was saved.
  const save = useCallback(
    async (patch: Partial<Omit<Job, "id" | "createdAt">>): Promise<boolean> => {
      if (!user || !job) return false;
      const before = Object.fromEntries(Object.keys(patch).map((k) => [k, job[k as keyof Job]])) as Partial<Job>;
      setJob((prev) => (prev ? { ...prev, ...patch } : prev));
      try {
        await updateJob(user.uid, jobId, patch);
        return true;
      } catch {
        setJob((prev) => (prev ? { ...prev, ...before } : prev));
        showToast("Couldn't save that. Check your connection and try again.", "error");
        return false;
      }
    },
    [user, job, jobId, showToast]
  );

  function goTo(next: JobStep) {
    setStep(next);
    router.replace(`/applications/${jobId}?step=${next}`, { scroll: false });
  }

  async function handleStageChange(stage: JobStage) {
    const patch: Partial<Job> = { stage };
    if (stage === "applied" && !job?.appliedAt) patch.appliedAt = new Date();
    if (await save(patch)) showToast(`Moved to ${STAGE_META[stage].label}`);
  }

  async function handleSourceChange(source: JobSource) {
    if (await save({ source })) showToast("Source updated");
  }

  async function handleScore() {
    if (!user) return;
    setScoring(true);
    setScoreError("");
    try {
      const res = await authedFetch("/api/fit-score", {
        method: "POST",
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (res.status === 401 || data.error === "no_key") { setScoreError(noKeyMessage("score roles")); return; }
      if (data.error === "no_resume") { setScoreError("Add a resume in Me first."); return; }
      if (data.error) { setScoreError(aiErrorMessage(res.status, data.error, "Scoring failed. Try again.")); return; }
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
    try {
      await deleteJob(user.uid, jobId);
      router.push("/applications");
    } catch {
      setDeleting(false);
      showToast("Couldn't delete this job. Try again.", "error");
    }
  }

  async function handleCreateCompany() {
    if (!user || !job) return;
    setCreatingCompany(true);
    try {
      const id = await createCompany(user.uid, { name: job.company, jobId: job.id });
      router.push(`/companies/${id}`);
    } finally {
      setCreatingCompany(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-white/60 dark:bg-gray-800 rounded-full w-64" />
        <div className="h-10 bg-white/60 dark:bg-gray-800 rounded-full w-full" />
        <div className="h-48 bg-white/60 dark:bg-gray-800 rounded-3xl" />
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center pt-20">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Job not found.</p>
        <Link href="/applications" className="text-sm text-primary-600 hover:underline">Back to your jobs</Link>
      </div>
    );
  }

  const done = stepsDone(job, activity);
  const interviewing = job.stage === "phone_screen" || job.stage === "interview";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Toast message={toast.message} tone={toast.tone} />

      <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-4">
        <i className="ti ti-arrow-left text-sm" aria-hidden="true" />
        All jobs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex-1 min-w-0">
          <h1 className="page-title mb-0.5">{job.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="sr-only" htmlFor="stage">Stage</label>
          <select id="stage" value={job.stage} onChange={(e) => handleStageChange(e.target.value as JobStage)} className={selectClass}>
            {ALL_STAGES.map((s) => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
          </select>
          {deleteConfirm ? (
            <>
              <button onClick={handleDelete} disabled={deleting} className="text-xs font-medium text-red-700 dark:text-red-400 hover:text-red-800 px-2 min-h-8 rounded-full transition-colors">
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button onClick={() => setDeleteConfirm(false)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 min-h-8 rounded-full transition-colors">Keep</button>
            </>
          ) : (
            <button onClick={() => setDeleteConfirm(true)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-400 transition-colors" aria-label="Delete job">
              <i className="ti ti-trash text-sm" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <StepRail current={step} done={done} onSelect={goTo} />

      {/* Decide: is this worth your time? */}
      {step === "decide" && (
        <div className="space-y-4">
          <div className="surface">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
              <div>
                <h2 className="section-label">Is it a fit?</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Measured against your resume and your goals in Me.</p>
              </div>
              <button onClick={handleScore} disabled={scoring} className="flex items-center gap-1.5 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950 px-3 py-1.5 rounded-full hover:bg-primary-100 dark:hover:bg-primary-900 disabled:opacity-50 transition-colors shrink-0">
                {scoring ? <i className="ti ti-loader-2 animate-spin text-xs" aria-hidden="true" /> : <i className="ti ti-sparkles text-xs" aria-hidden="true" />}
                {scoring ? "Scoring…" : job.fitScore != null ? "Score again" : "Score this role"}
              </button>
            </div>
            <div className="px-5 py-4">
              {job.fitScore != null ? (
                <div className="flex items-start gap-4">
                  <span className={`text-3xl font-display font-extrabold shrink-0 ${job.fitScore >= 80 ? "text-emerald-700 dark:text-emerald-400" : job.fitScore >= 60 ? "text-amber-700 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                    {job.fitScore}
                  </span>
                  <div>
                    <div className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full mb-1.5 ${job.fitScore >= 80 ? "bg-emerald-50 text-emerald-700" : job.fitScore >= 60 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}>
                      {job.fitScore >= 80 ? "Strong fit" : job.fitScore >= 60 ? "Moderate fit" : "Weak fit"}
                    </div>
                    {job.fitReasoning && <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{job.fitReasoning}</p>}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {scoreError ? <span role="alert" className="text-amber-800 dark:text-amber-300">{scoreError}</span> : "Score it to see how well this role matches you before you spend an evening on it."}
                </p>
              )}
              {scoreError && job.fitScore != null && <p role="alert" className="text-xs text-amber-800 dark:text-amber-300 mt-2">{scoreError}</p>}
            </div>
          </div>

          <div className="surface">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="section-label">Job description</h2>
            </div>
            <div className="px-5 py-2">
              <EditableField label="Job description" value={job.description || null} placeholder="Paste the job description…" multiline onSave={(v) => save({ description: v })} />
            </div>
          </div>

          <div className="surface">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="section-label">The company</h2>
            </div>
            {company ? (
              <div className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{company.name}</p>
                  {company.whatTheyDo && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{company.whatTheyDo}</p>}
                </div>
                <Link href={`/companies/${company.id}`} className="text-xs text-primary-600 hover:underline shrink-0 ml-4">Open research</Link>
              </div>
            ) : (
              <div className="px-5 py-3 flex items-center justify-between gap-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Research what they do, their values and recent news.</p>
                <button onClick={handleCreateCompany} disabled={creatingCompany} className="text-xs text-primary-600 hover:underline disabled:opacity-50 shrink-0">
                  {creatingCompany ? "Starting…" : "Start research"}
                </button>
              </div>
            )}
          </div>

          <div className="surface">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="section-label">Details</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {([
                { label: "Title", value: job.title, key: "title" },
                { label: "Company", value: job.company, key: "company" },
                { label: "Location", value: job.location, key: "location", placeholder: "Add location" },
                { label: "Salary", value: job.salary, key: "salary", placeholder: "Add salary range" },
              ] as { label: string; value: string | null; key: keyof Job; placeholder?: string }[]).map(({ label, value, key, placeholder }) => (
                <div key={key} className="flex items-center gap-4 px-5">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">{label}</span>
                  <div className="flex-1 py-1">
                    <EditableField label={label} value={value} placeholder={placeholder ?? "—"} onSave={(v) => save({ [key]: v || null })} />
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4 px-5">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">URL</span>
                <div className="flex-1 py-1 flex items-center gap-2">
                  <EditableField label="Job URL" value={job.url} placeholder="Add job URL" onSave={(v) => save({ url: v || null })} className="flex-1" />
                  {job.url && (
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 shrink-0" aria-label="Open job posting">
                      <i className="ti ti-external-link text-sm" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 px-5 py-2.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">Source</span>
                <select aria-label="Source" value={job.source} onChange={(e) => handleSourceChange(e.target.value as JobSource)} className={`${selectClass} font-normal`}>
                  {ALL_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                </select>
              </div>
              {resumes.length > 0 && (
                <div className="flex items-center gap-4 px-5 py-2.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">Resume</span>
                  <select
                    aria-label="Resume used"
                    value={job.resumeIdUsed ?? ""}
                    onChange={async (e) => { if (await save({ resumeIdUsed: e.target.value || null })) showToast("Resume updated"); }}
                    className={`${selectClass} font-normal`}
                  >
                    <option value="">Not set</option>
                    {resumes.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
              )}
              {job.appliedAt && (
                <div className="flex items-center gap-4 px-5 py-2.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">Applied</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">{formatDate(job.appliedAt)}</span>
                </div>
              )}
              {job.lastFollowUpAt && (
                <div className="flex items-center gap-4 px-5 py-2.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">Followed up</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">{formatDate(job.lastFollowUpAt)}</span>
                </div>
              )}
              <div className="flex items-center gap-4 px-5 py-2.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">Added</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(job.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="surface">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="section-label">Notes</h2>
            </div>
            <div className="px-5 py-2">
              <EditableField label="Notes" value={job.notes} placeholder="Anything worth remembering about this role…" multiline onSave={(v) => save({ notes: v || null })} />
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => goTo("apply")} className="flex items-center gap-1.5 text-sm font-medium text-primary-700 dark:text-primary-300 hover:underline">
              Next: write your letter
              <i className="ti ti-arrow-right text-sm" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Apply: the letter */}
      {step === "apply" && (
        <>
          {job.stage === "saved" && activity.letters > 0 && (
            <Nudge text="Sent it off?" action="Mark as applied" onClick={() => handleStageChange("applied")} />
          )}
          {job.stage === "applied" && (
            <Nudge text="Heard back with an interview?" action="Move to interviewing" onClick={() => { handleStageChange("interview"); goTo("interview"); }} />
          )}
          <CoverLetterPanel job={job} onLettersChange={(letters) => setActivity((a) => ({ ...a, letters }))} />
        </>
      )}

      {/* Interview: prep */}
      {step === "interview" && (
        <>
          {!interviewing && job.stage !== "offer" && (
            <Nudge text="Got an interview on the calendar?" action="Move to interviewing" onClick={() => handleStageChange("interview")} />
          )}
          {interviewing && (
            <div className="surface px-5 py-4 mb-4">
              <h2 className="section-label">When is it?</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">
                Today will remind you to prep beforehand and ask how it went afterwards.
              </p>
              <InterviewDateField
                value={job.nextInterviewAt}
                onSave={async (nextInterviewAt) => {
                  if (await save({ nextInterviewAt })) showToast(nextInterviewAt ? "Interview date saved" : "Interview date cleared");
                }}
              />
            </div>
          )}
          <InterviewPrepPanel job={job} onPrepsChange={(preps) => setActivity((a) => ({ ...a, preps }))} />
        </>
      )}

      {/* Debrief: what happened */}
      {step === "debrief" && (
        <DebriefPanel job={job} onDebriefsChange={(debriefs) => setActivity((a) => ({ ...a, debriefs }))} />
      )}

      {/* Outcome: how it ended */}
      {step === "outcome" && (
        <div className="space-y-4">
          <div className="surface p-5">
            <h2 className="section-label mb-1">How did it end?</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Closing the loop keeps Today focused on what&apos;s still open.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {OUTCOMES.map((o) => {
                const chosen = job.stage === o.stage;
                return (
                  <button
                    key={o.stage}
                    onClick={() => handleStageChange(o.stage)}
                    aria-pressed={chosen}
                    className={`text-left p-4 rounded-2xl border transition-all ${
                      chosen
                        ? "glow-gradient border-transparent shadow-sm"
                        : "border-gray-200 dark:border-gray-700 hover:bg-white/70 dark:hover:bg-white/5"
                    }`}
                  >
                    <i className={`ti ${o.icon} text-xl text-gray-700 dark:text-gray-200`} aria-hidden="true" />
                    <p className="mt-2 text-sm font-display font-bold text-gray-900 dark:text-gray-50">{o.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{o.blurb}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="surface px-5 py-4">
            <h2 className="section-label">One thing to remember</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">A sentence for future you. It stays in this job&apos;s notes.</p>
            <EditableField label="One thing to remember" value={job.notes} placeholder="e.g. Ask about team size earlier next time." multiline onSave={(v) => save({ notes: v || null })} />
          </div>
          <Link href="/weekly-review" className="flex items-center gap-1.5 text-sm text-primary-700 dark:text-primary-300 hover:underline">
            <i className="ti ti-calendar-heart text-sm" aria-hidden="true" />
            Reflect on it in your weekly review
          </Link>
        </div>
      )}
    </div>
  );
}

export default function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  return (
    <Suspense>
      <JobWorkspace jobId={jobId} />
    </Suspense>
  );
}
