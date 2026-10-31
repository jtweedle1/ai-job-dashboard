"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { authedFetch, noKeyMessage } from "@/lib/api-client";
import { aiErrorMessage } from "@/lib/ai-errors";
import { getInterviewPrepsByJobId, deleteInterviewPrep } from "@/lib/interviewPreps";
import { createAnswer } from "@/lib/answerBank";
import Toast from "@/components/Toast";
import { useToast } from "@/lib/use-toast";
import { useDraft } from "@/lib/use-draft";
import type { Job } from "@/types/job";
import type { InterviewPrep } from "@/types/interviewPrep";
import Button, { IconButton } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { InlineMessage, Section, Sheet, Skeleton } from "@/components/ui/bits";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// One tap fills in the kind of round, so the box is never a blank page.
const ROUND_KINDS = ["Recruiter screen", "Hiring manager", "Panel", "Technical"];

// The Interview step of a job: mock questions and study tips for the round ahead.
export default function InterviewPrepPanel({
  job,
  onPrepsChange,
}: {
  job: Job;
  onPrepsChange?: (count: number) => void;
}) {
  const { user } = useAuth();

  const [preps, setPreps] = useState<InterviewPrep[]>([]);
  const [loading, setLoading] = useState(true);
  const { value: interviewProcess, setValue: setInterviewProcess } = useDraft(`prep-round:${job.id}`, "", (v) => !v.trim());
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [viewingPrep, setViewingPrep] = useState<InterviewPrep | null>(null);
  const [savingQuestionIndex, setSavingQuestionIndex] = useState<number | null>(null);
  const { show: showToast, toastProps } = useToast();

  useEffect(() => {
    if (!user) return;
    getInterviewPrepsByJobId(user.uid, job.id).then((p) => {
      setPreps(p);
      setViewingPrep(p[0] ?? null);
      setLoading(false);
    });
  }, [user, job.id]);

  function updatePreps(next: InterviewPrep[]) {
    setPreps(next);
    onPrepsChange?.(next.length);
  }


  async function handleGenerate() {
    if (!user) return;
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await authedFetch("/api/interview-prep", {
        method: "POST",
        body: JSON.stringify({ jobId: job.id, interviewProcess: interviewProcess.trim() }),
      });
      const data = await res.json();
      if (res.status === 401 || data.error === "no_key") {
        setGenerateError(noKeyMessage("generate interview prep"));
        return;
      }
      if (data.error) {
        setGenerateError(aiErrorMessage(res.status, data.error, "Generation failed. Try again."));
        return;
      }
      const newPrep: InterviewPrep = {
        id: data.id,
        jobId: job.id,
        interviewProcess: data.interviewProcess ?? interviewProcess.trim(),
        mockQuestions: data.questions,
        studyTips: data.studyTips,
        createdAt: new Date(),
      };
      updatePreps([newPrep, ...preps]);
      setViewingPrep(newPrep);
      setInterviewProcess("");
      showToast("Interview prep ready");
    } catch {
      setGenerateError("Something went wrong. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  // Gone from the page at once; really deleted only once the Undo toast has gone.
  function handleDelete(id: string) {
    if (!user) return;
    const uid = user.uid;
    const before = preps;
    const wasViewing = viewingPrep;
    const next = preps.filter((p) => p.id !== id);
    updatePreps(next);
    if (viewingPrep?.id === id) setViewingPrep(next[0] ?? null);
    const restore = () => {
      updatePreps(before);
      setViewingPrep(wasViewing);
    };
    showToast("Prep deleted", {
      undo: restore,
      commit: () =>
        void deleteInterviewPrep(uid, id).catch(() => {
          restore();
          showToast("Couldn't delete that prep. Try again.", { tone: "error" });
        }),
    });
  }

  async function handleSaveQuestion(question: string, index: number) {
    if (!user || !viewingPrep) return;
    setSavingQuestionIndex(index);
    try {
      await createAnswer(user.uid, { question, answer: "", tags: ["interview-prep"], jobId: job.id });
      showToast("Question saved to Answers");
    } finally {
      setSavingQuestionIndex(null);
    }
  }

  if (loading) {
    return <Skeleton className="h-56 rounded-sheet" />;
  }

  const form = (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <label htmlFor="prep-round" className="text-label font-semibold text-ink-soft mr-1">
          About this round <span className="font-normal">(optional)</span>
        </label>
        {ROUND_KINDS.map((k) => (
          <Button
            key={k}
            size="sm"
            onClick={() => setInterviewProcess((v) => (v.trim() ? `${v.trim()}, ${k.toLowerCase()}` : k))}
          >
            {k}
          </Button>
        ))}
      </div>
      <TextArea
        id="prep-round"
        value={interviewProcess}
        onChange={(e) => setInterviewProcess(e.target.value)}
        placeholder="e.g. 30 minutes with the hiring manager, mostly about past projects"
        rows={3}
        className="mt-3"
      />
      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <Button variant={viewingPrep ? "secondary" : "primary"} icon="ti-wand" loading={generating} loadingLabel="Preparing…" onClick={handleGenerate}>
          Build my prep
        </Button>
      </div>
      {generateError && (
        <InlineMessage tone="caution" role="alert" className="mt-4">
          {generateError}
        </InlineMessage>
      )}
    </>
  );
  const formIntro = "Practice questions built from this job description. Telling it about the round helps, but you can skip it.";

  return (
    <div>
      <Toast {...toastProps} />

      {viewingPrep ? (
        <Sheet as="section" aria-labelledby="prep-heading">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="prep-heading" className="font-serif text-heading font-semibold text-ink">
                Your prep
              </h2>
              <p className="mt-0.5 text-meta text-ink-muted">{formatDate(viewingPrep.createdAt)}</p>
            </div>
            <IconButton icon="ti-trash" label="Delete prep" onClick={() => handleDelete(viewingPrep.id)} />
          </div>

          <h3 className="mt-6 text-label font-semibold text-ink-soft">The process</h3>
          <p className="mt-1 font-serif italic text-reading text-ink">{viewingPrep.interviewProcess}</p>

          <h3 className="mt-8 text-label font-semibold text-ink-soft">Practice questions</h3>
          <ol className="mt-2">
            {viewingPrep.mockQuestions.map((q, i) => (
              <li key={i} className="flex gap-4 py-3 border-b border-rule last:border-b-0 group">
                <span className="w-6 shrink-0 pt-0.5 font-serif font-semibold text-ink-soft tabular-nums text-right">{i + 1}</span>
                <p className="flex-1 text-reading text-ink">{q}</p>
                <IconButton
                  icon={savingQuestionIndex === i ? "ti-loader-2 animate-spin" : "ti-bookmarks"}
                  label="Save to Answers"
                  size="sm"
                  disabled={savingQuestionIndex === i}
                  onClick={() => handleSaveQuestion(q, i)}
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 shrink-0"
                />
              </li>
            ))}
          </ol>

          {viewingPrep.studyTips && (
            <>
              <h3 className="mt-8 text-label font-semibold text-ink-soft">Study tips</h3>
              <ul className="mt-2 space-y-2">
                {viewingPrep.studyTips
                  .split("\n")
                  .filter(Boolean)
                  .map((tip, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-sun shrink-0" aria-hidden="true" />
                      <p className="text-ink">{tip}</p>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </Sheet>
      ) : (
        <Sheet as="section" aria-labelledby="prep-form-heading">
          <h2 id="prep-form-heading" className="font-serif text-heading font-semibold text-ink">
            Prep for the interview
          </h2>
          <p className="mt-1 mb-5 text-meta text-ink-soft">{formIntro}</p>
          {form}
        </Sheet>
      )}

      {viewingPrep && (
        <Section title="Prep for another round" serif id="prep-again" className="mt-12">
          <p className="-mt-2 mb-4 text-meta text-ink-soft">{formIntro}</p>
          {form}
        </Section>
      )}

      {preps.length > 1 && (
        <Section title="Earlier prep" serif id="prep-earlier" className="mt-12">
          <ul>
            {preps.map((prep) => {
              const viewing = viewingPrep?.id === prep.id;
              return (
                <li key={prep.id} className="flex items-center justify-between gap-4 py-3 border-b border-rule last:border-b-0">
                  <p className="text-ink-soft truncate">
                    {prep.mockQuestions.length} questions · {formatDate(prep.createdAt)}
                  </p>
                  {viewing ? (
                    <span className="text-meta font-semibold text-ink">Showing above</span>
                  ) : (
                    <Button variant="quiet" size="sm" onClick={() => setViewingPrep(prep)}>
                      Show
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </div>
  );
}
