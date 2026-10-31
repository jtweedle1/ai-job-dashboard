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
import { JOB_STEPS, dayLabel, isStep, stepsDone, suggestedStep, type JobActivity, type JobStep } from "@/lib/next-steps";
import { interviewIcs } from "@/lib/calendar";
import EditableField from "@/components/EditableField";
import Toast from "@/components/Toast";
import CoverLetterPanel from "@/components/job/CoverLetterPanel";
import InterviewPrepPanel from "@/components/job/InterviewPrepPanel";
import DebriefPanel from "@/components/job/DebriefPanel";
import InterviewDateField from "@/components/job/InterviewDateField";
import PageFrame from "@/components/ui/PageFrame";
import Button, { buttonClasses } from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Menu from "@/components/ui/Menu";
import Dialog from "@/components/ui/Dialog";
import Trail from "@/components/ui/Trail";
import { EmptyState, InlineMessage, LoadingBlocks, Section, Sheet } from "@/components/ui/bits";
import { useToast } from "@/lib/use-toast";
import {
  STAGE_META, SOURCE_LABELS, ALL_STAGES, ALL_SOURCES, fitWord,
  type Job, type JobStage, type JobSource,
} from "@/types/job";
import type { Company } from "@/types/company";
import type { Resume } from "@/types/resume";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STAGE_OPTIONS = ALL_STAGES.map((s) => ({ value: s, label: STAGE_META[s].label }));
const SOURCE_OPTIONS = ALL_SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] }));

// The five steps of a job, drawn as the trail. Every stop opens its step.
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
    <div className="mb-8 -mx-2">
      <Trail
        label="Steps for this job"
        stops={JOB_STEPS.map((s) => ({
          id: s.id,
          label: s.label,
          state: s.id === current ? "current" : done[s.id] ? "done" : "upcoming",
          srHint: done[s.id] ? "(done)" : undefined,
          onSelect: () => onSelect(s.id),
        }))}
      />
    </div>
  );
}

// A gentle prompt to move the job along, on the sun's wash.
function Nudge({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return (
    <div className="mb-6 flex items-center gap-3 flex-wrap px-5 py-3 rounded-field bg-sun-wash">
      <span className="w-2 h-2 rounded-full bg-sun shrink-0" aria-hidden="true" />
      <p className="text-ink flex-1 min-w-[12rem]">{text}</p>
      <Button variant="secondary" size="sm" onClick={onClick}>
        {action}
      </Button>
    </div>
  );
}

function Fact({ children }: { children: React.ReactNode }) {
  return <li className="inline-flex items-center gap-1.5">{children}</li>;
}

// The few facts worth having on every step, so none of them has to be remembered. Empty ones stay hidden.
function JobFacts({ job, now, onSave }: { job: Job; now: Date; onSave: (patch: Partial<Job>) => void }) {
  const snoozed = job.snoozedUntil && job.snoozedUntil > now;
  const link = "font-semibold text-action hover:underline underline-offset-4";
  return (
    <ul aria-label="At a glance" className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-meta text-ink-soft empty:hidden">
      {job.stage === "saved" && job.applyBy && <Fact>Apply by {dayLabel(job.applyBy, now)}</Fact>}
      {job.appliedAt && <Fact>Applied {formatDate(job.appliedAt)}</Fact>}
      {job.lastFollowUpAt && (
        <Fact>
          Followed up {formatDate(job.lastFollowUpAt)}
          {job.followUps > 1 ? ` (${job.followUps} times)` : ""}
        </Fact>
      )}
      {job.nextInterviewAt && <Fact>Interview {dayLabel(job.nextInterviewAt, now)}</Fact>}
      {job.url && (
        <Fact>
          <a href={job.url} target="_blank" rel="noopener noreferrer" className={link}>
            Job posting<span className="sr-only"> (opens in a new tab)</span>
            <i className="ti ti-arrow-up-right ml-0.5" aria-hidden="true" />
          </a>
        </Fact>
      )}
      {snoozed && (
        <Fact>
          Hidden from Today until {dayLabel(job.snoozedUntil!, now)}
          <button type="button" onClick={() => onSave({ snoozedUntil: null })} className={link}>
            Show it again
          </button>
        </Fact>
      )}
      {job.stage === "applied" && job.followUpsOff && (
        <Fact>
          Follow-up reminders off
          <button type="button" onClick={() => onSave({ followUpsOff: false, followUps: 0 })} className={link}>
            Turn back on
          </button>
        </Fact>
      )}
    </ul>
  );
}

// An all-day event for the interview, downloaded as a file the person's own calendar can open.
function downloadInterview(job: Job) {
  if (!job.nextInterviewAt) return;
  const d = job.nextInterviewAt;
  const ics = interviewIcs({
    uid: `${job.id}-${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}`,
    title: `${STAGE_META[job.stage].label}: ${job.company}, ${job.title}`,
    day: d,
    details: "Added from Wayfinder.",
    url: job.url,
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = `${job.company} interview.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Notes follow you through every step, folded away until there's something in them.
function NotesCard({ notes, onSave }: { notes: string | null; onSave: (v: string) => void }) {
  return (
    <details open={!!notes} className="mt-12 group">
      <summary className="cursor-pointer list-none inline-flex items-center gap-2 rounded-stamp font-serif text-heading font-semibold text-ink">
        <h2>Notes</h2>
        <i className="ti ti-chevron-down text-base text-ink-soft transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-2 -mx-3">
        <EditableField label="Notes" value={notes} placeholder="Anything worth remembering about this role…" multiline onSave={onSave} />
      </div>
    </details>
  );
}

const OUTCOMES: { stage: JobStage; label: string; blurb: string }[] = [
  { stage: "offer", label: "Got an offer", blurb: "Well earned." },
  { stage: "rejected", label: "Not this time", blurb: "It happens to everyone. Your notes still count." },
  { stage: "withdrawn", label: "I stepped away", blurb: "Knowing when to walk away is a skill." },
];

const FIT_TONE = { moss: "text-moss", "ink-soft": "text-ink", stone: "text-stone" } as const;

// One row of the Details list: a label and its value, lined up.
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] sm:items-center gap-x-4 py-1.5 border-b border-rule last:border-b-0">
      <dt className="text-label font-semibold text-ink-soft pt-2 sm:pt-0">{label}</dt>
      <dd className="min-w-0 sm:-ml-3 -mx-3 sm:mr-0">{children}</dd>
    </div>
  );
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
  const { show, toastProps } = useToast();
  // Bumped each time the job is marked applied, so the "Sent" stamp presses on again.
  const [sentStamp, setSentStamp] = useState(0);

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

  const showToast = useCallback((message: string, tone: "done" | "error" = "done") => show(message, { tone }), [show]);

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
    if (await save(patch)) {
      showToast(`Moved to ${STAGE_META[stage].label}`);
      if (stage === "applied") setSentStamp((n) => n + 1);
    }
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

  const back = (
    <Link href="/applications" className="hit inline-flex items-center gap-1 text-meta font-semibold text-ink-soft hover:text-ink">
      <i className="ti ti-arrow-left" aria-hidden="true" />
      All jobs
    </Link>
  );

  if (loading) {
    return (
      <PageFrame>
        <LoadingBlocks rows={2} label="Loading this job" />
      </PageFrame>
    );
  }

  if (notFound || !job) {
    return (
      <PageFrame>
        <EmptyState
          title="We couldn't find that job"
          action={
            <Link href="/applications" className={buttonClasses({ variant: "secondary" })}>
              Back to your jobs
            </Link>
          }
        >
          It may have been deleted.
        </EmptyState>
      </PageFrame>
    );
  }

  const done = stepsDone(job, activity);
  const interviewing = job.stage === "phone_screen" || job.stage === "interview";
  const fit = job.fitScore != null ? fitWord(job.fitScore) : null;
  const resumeOptions = [{ value: "", label: "Not set" }, ...resumes.map((r) => ({ value: r.id, label: r.label }))];

  return (
    <PageFrame>
      <Toast {...toastProps} />

      <header className="pt-2 mb-8">
        <div className="mb-3">{back}</div>
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-title font-semibold text-ink text-balance">{job.title}</h1>
            <p className="mt-1 text-ink-soft">
              <span className="font-semibold text-ink">{job.company}</span>
              {job.location ? ` · ${job.location}` : ""}
            </p>
          </div>
          <Menu
            items={[
              ...(job.url
                ? [{ label: "Open the job posting", icon: "ti-arrow-up-right", onSelect: () => window.open(job.url!, "_blank", "noopener,noreferrer") }]
                : []),
              { label: "Delete job", icon: "ti-trash", danger: true, onSelect: () => setDeleteConfirm(true) },
            ]}
          />
        </div>
        <div className="mt-4 flex items-center gap-x-5 gap-y-3 flex-wrap">
          <Select look="pill" prefix="Stage:" value={job.stage} options={STAGE_OPTIONS} onChange={handleStageChange} ariaLabel="Stage" />
          {sentStamp > 0 && job.stage === "applied" && (
            <span
              key={sentStamp}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-stamp border-2 border-sky text-sky font-serif font-semibold -rotate-3 animate-[stamp_160ms_var(--ease-out)]"
            >
              <i className="ti ti-send" aria-hidden="true" />
              Sent
            </span>
          )}
        </div>
        <JobFacts job={job} now={new Date()} onSave={save} />
      </header>

      <StepRail current={step} done={done} onSelect={goTo} />

      {/* Decide: is this worth your time? */}
      {step === "decide" && (
        <>
          <Sheet as="section" aria-labelledby="fit-heading">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h2 id="fit-heading" className="font-serif text-heading font-semibold text-ink">
                  Is it a fit?
                </h2>
                <p className="mt-1 text-meta text-ink-soft">Measured against your resume and your goals in Me.</p>
              </div>
              <Button variant={job.fitScore != null ? "quiet" : "primary"} icon="ti-sparkles" loading={scoring} loadingLabel="Scoring…" onClick={handleScore}>
                {job.fitScore != null ? "Score again" : "Score this role"}
              </Button>
            </div>
            {job.fitScore != null && fit ? (
              <div className="mt-6 flex items-start gap-5">
                <span className={`font-serif text-display font-semibold leading-none tabular-nums ${FIT_TONE[fit.tone]}`}>{job.fitScore}</span>
                <div className="min-w-0">
                  <p className={`font-semibold ${FIT_TONE[fit.tone]}`}>{fit.word} fit</p>
                  {job.fitReasoning && <p className="mt-1 text-reading text-ink-soft">{job.fitReasoning}</p>}
                </div>
              </div>
            ) : (
              !scoreError && <p className="mt-5 text-ink-soft">Score it to see how well this role matches you before you spend an evening on it.</p>
            )}
            {scoreError && (
              <InlineMessage tone="caution" role="alert" className="mt-5">
                {scoreError}
              </InlineMessage>
            )}
          </Sheet>

          <div className="mt-12 space-y-12">
            <Section title="Job description" serif id="description">
              <div className="-mx-3">
                <EditableField label="Job description" value={job.description || null} placeholder="Paste the job description…" multiline onSave={(v) => save({ description: v })} />
              </div>
            </Section>

            <Section title="The company" serif id="company">
              {company ? (
                <Link
                  href={`/companies/${company.id}`}
                  className="group flex items-center gap-3 py-3 px-3 -mx-3 rounded-field hover:bg-well transition-colors duration-100"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-ink">{company.name}</span>
                    {company.whatTheyDo && <span className="block mt-0.5 text-meta text-ink-soft line-clamp-2">{company.whatTheyDo}</span>}
                  </span>
                  <span className="text-ui font-semibold text-action shrink-0">Open research</span>
                  <i className="ti ti-arrow-right text-action" aria-hidden="true" />
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-ink-soft">Research what they do, their values and recent news.</p>
                  <Button variant="secondary" size="sm" loading={creatingCompany} loadingLabel="Starting…" onClick={handleCreateCompany}>
                    Start research
                  </Button>
                </div>
              )}
            </Section>

            <Section title="Details" serif id="details">
              <dl>
                {([
                  { label: "Title", value: job.title, key: "title" },
                  { label: "Company", value: job.company, key: "company" },
                  { label: "Location", value: job.location, key: "location", placeholder: "Add location" },
                  { label: "Salary", value: job.salary, key: "salary", placeholder: "Add salary range" },
                  { label: "Link", value: job.url, key: "url", placeholder: "Add the job posting's link" },
                ] as { label: string; value: string | null; key: keyof Job; placeholder?: string }[]).map(({ label, value, key, placeholder }) => (
                  <Detail key={key} label={label}>
                    <EditableField label={label} value={value} placeholder={placeholder ?? "—"} onSave={(v) => save({ [key]: v || null })} />
                  </Detail>
                ))}
                <Detail label="Source">
                  <div className="py-1 px-3">
                    <Select value={job.source} options={SOURCE_OPTIONS} onChange={handleSourceChange} ariaLabel="Source" className="max-w-xs" />
                  </div>
                </Detail>
                {job.stage === "saved" && (
                  <Detail label="Apply by">
                    <div className="py-1 px-3">
                      <InterviewDateField
                        label="Apply by"
                        labelClassName="sr-only"
                        value={job.applyBy}
                        onSave={async (applyBy) => {
                          if (await save({ applyBy })) showToast(applyBy ? "Apply-by day saved" : "Apply-by day cleared");
                        }}
                      />
                    </div>
                  </Detail>
                )}
                {resumes.length > 0 && (
                  <Detail label="Resume">
                    <div className="py-1 px-3">
                      <Select
                        value={job.resumeIdUsed ?? ""}
                        options={resumeOptions}
                        ariaLabel="Resume used"
                        className="max-w-xs"
                        onChange={async (v) => {
                          if (await save({ resumeIdUsed: v || null })) showToast("Resume updated");
                        }}
                      />
                    </div>
                  </Detail>
                )}
                {job.appliedAt && (
                  <Detail label="Applied">
                    <p className="py-2 px-3 text-ink">{formatDate(job.appliedAt)}</p>
                  </Detail>
                )}
                {job.lastFollowUpAt && (
                  <Detail label="Followed up">
                    <p className="py-2 px-3 text-ink">{formatDate(job.lastFollowUpAt)}</p>
                  </Detail>
                )}
                <Detail label="Added">
                  <p className="py-2 px-3 text-ink-soft">{formatDate(job.createdAt)}</p>
                </Detail>
              </dl>
            </Section>

            <Section title="Notes" serif id="notes">
              <div className="-mx-3">
                <EditableField label="Notes" value={job.notes} placeholder="Anything worth remembering about this role…" multiline onSave={(v) => save({ notes: v || null })} />
              </div>
            </Section>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => goTo("apply")}>
                Next: write your letter
                <i className="ti ti-arrow-right" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Apply: the letter */}
      {step === "apply" && (
        <>
          {job.stage === "saved" && activity.letters > 0 && (
            <Nudge text="Sent it off?" action="Mark as applied" onClick={() => handleStageChange("applied")} />
          )}
          {job.stage === "applied" && (
            <Nudge
              text="Heard back with an interview?"
              action="Move to interviewing"
              onClick={() => {
                handleStageChange("interview");
                goTo("interview");
              }}
            />
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
            <section aria-labelledby="when-heading" className="mb-10">
              <h2 id="when-heading" className="font-serif text-heading font-semibold text-ink">
                When is it?
              </h2>
              <p className="mt-1 mb-4 text-meta text-ink-soft">Today will remind you to prep beforehand and ask how it went afterwards.</p>
              <div className="flex items-center gap-x-4 gap-y-3 flex-wrap">
                <InterviewDateField
                  labelClassName="sr-only"
                  value={job.nextInterviewAt}
                  onSave={async (nextInterviewAt) => {
                    if (await save({ nextInterviewAt })) showToast(nextInterviewAt ? "Interview date saved" : "Interview date cleared");
                  }}
                />
                {job.nextInterviewAt && (
                  <Button variant="quiet" size="sm" icon="ti-calendar-plus" onClick={() => downloadInterview(job)}>
                    Add to my calendar
                  </Button>
                )}
              </div>
            </section>
          )}
          <InterviewPrepPanel job={job} onPrepsChange={(preps) => setActivity((a) => ({ ...a, preps }))} />
        </>
      )}

      {/* Debrief: what happened */}
      {step === "debrief" && <DebriefPanel job={job} onDebriefsChange={(debriefs) => setActivity((a) => ({ ...a, debriefs }))} />}

      {(step === "apply" || step === "interview" || step === "debrief") && (
        <NotesCard notes={job.notes} onSave={(v) => save({ notes: v || null })} />
      )}

      {/* Outcome: how it ended */}
      {step === "outcome" && (
        <>
          <Sheet as="section" aria-labelledby="outcome-heading">
            <h2 id="outcome-heading" className="font-serif text-heading font-semibold text-ink">
              How did it end?
            </h2>
            <p className="mt-1 text-meta text-ink-soft">Closing the loop keeps Today focused on what&apos;s still open.</p>
            <ul className="mt-5 -mx-3">
              {OUTCOMES.map((o) => {
                const chosen = job.stage === o.stage;
                return (
                  <li key={o.stage}>
                    <button
                      type="button"
                      onClick={() => handleStageChange(o.stage)}
                      aria-pressed={chosen}
                      className={`w-full flex items-start gap-4 px-3 py-3.5 rounded-field text-left transition-colors duration-100 ${
                        chosen ? "bg-well" : "hover:bg-well"
                      }`}
                    >
                      <span
                        className={`mt-1 w-4 h-4 shrink-0 rounded-full ${chosen ? "bg-sun ring-4 ring-sun-wash" : "border-[1.5px] border-control"}`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{o.label}</span>
                        <span className="block text-meta text-ink-soft">{o.blurb}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Sheet>
          <div className="mt-12 space-y-8">
            <Section title="One thing to remember" serif id="remember">
              <p className="-mt-2 mb-2 text-meta text-ink-soft">A sentence for future you. It stays in this job&apos;s notes.</p>
              <div className="-mx-3">
                <EditableField label="One thing to remember" value={job.notes} placeholder="e.g. Ask about team size earlier next time." multiline onSave={(v) => save({ notes: v || null })} />
              </div>
            </Section>
            <Link href="/weekly-review" className="inline-flex items-center gap-1.5 text-ui font-semibold text-action hover:underline underline-offset-4">
              Reflect on it in your weekly review
              <i className="ti ti-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </>
      )}

      {deleteConfirm && (
        <Dialog
          title="Delete this job?"
          description="Its letters, prep and notes go too. This can't be undone."
          onRequestClose={() => setDeleteConfirm(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteConfirm(false)}>
                Keep it
              </Button>
              <Button variant="danger-solid" loading={deleting} loadingLabel="Deleting…" onClick={handleDelete}>
                Delete job
              </Button>
            </>
          }
        />
      )}
    </PageFrame>
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
