"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { authedFetch, noKeyMessage } from "@/lib/api-client";
import { aiErrorMessage } from "@/lib/ai-errors";
import { getInterviewPrepsByJobId, deleteInterviewPrep } from "@/lib/interviewPreps";
import { createAnswer } from "@/lib/answerBank";
import Toast from "@/components/Toast";
import { useToast } from "@/lib/use-toast";
import type { Job } from "@/types/job";
import type { InterviewPrep } from "@/types/interviewPrep";

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
  const [interviewProcess, setInterviewProcess] = useState("");
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
      showToast("Question saved to your stories");
    } finally {
      setSavingQuestionIndex(null);
    }
  }

  if (loading) {
    return <div className="h-48 bg-white/60 dark:bg-gray-800 rounded-3xl animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <Toast {...toastProps} />

      {viewingPrep && (
        <div className="surface overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="section-label">Your prep</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(viewingPrep.createdAt)}</p>
            </div>
            <button
              onClick={() => handleDelete(viewingPrep.id)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50 shrink-0"
              aria-label="Delete prep"
            >
              <i className="ti ti-trash text-sm" aria-hidden="true" />
            </button>
          </div>

          <div className="px-5 pt-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">The process</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 italic">{viewingPrep.interviewProcess}</p>
          </div>

          <div className="px-5 pt-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Practice questions</p>
            <ol className="space-y-2.5">
              {viewingPrep.mockQuestions.map((q, i) => (
                <li key={i} className="flex gap-3 group">
                  <span className="w-6 h-6 rounded-full glow-gradient text-[11px] font-bold text-gray-700 dark:text-gray-100 flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-200 flex-1 pt-0.5">{q}</p>
                  <button
                    onClick={() => handleSaveQuestion(q, i)}
                    disabled={savingQuestionIndex === i}
                    className="w-8 h-8 -mt-1 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 pointer-coarse:opacity-100 shrink-0 disabled:opacity-50"
                    aria-label="Save to your stories"
                    title="Save to your stories"
                  >
                    {savingQuestionIndex === i ? (
                      <i className="ti ti-loader-2 animate-spin text-xs" aria-hidden="true" />
                    ) : (
                      <i className="ti ti-bookmarks text-xs" aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))}
            </ol>
          </div>

          {viewingPrep.studyTips && (
            <div className="px-5 pt-4 pb-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Study tips</p>
              <div className="space-y-1.5">
                {viewingPrep.studyTips.split("\n").filter(Boolean).map((tip, i) => (
                  <div key={i} className="flex gap-2">
                    <i className="ti ti-sparkles text-primary-400 text-sm shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="surface">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="section-label">{preps.length ? "Prep for another round" : "Prep for the interview"}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Practice questions built from this job description. Telling it about the round helps, but you can skip it.
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <label htmlFor="prep-round" className="text-xs text-gray-500 dark:text-gray-400 mr-1">
              About this round <span className="text-gray-500 dark:text-gray-400">(optional)</span>
            </label>
            {ROUND_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setInterviewProcess((v) => (v.trim() ? `${v.trim()}, ${k.toLowerCase()}` : k))}
                className="text-xs font-medium px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 transition-colors"
              >
                {k}
              </button>
            ))}
          </div>
          <textarea
            id="prep-round"
            value={interviewProcess}
            onChange={(e) => setInterviewProcess(e.target.value)}
            placeholder="e.g. 30 minutes with the hiring manager, mostly about past projects"
            rows={3}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none bg-white dark:bg-gray-800"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-sm shadow-primary-600/20 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
              ) : (
                <i className="ti ti-wand text-sm" aria-hidden="true" />
              )}
              {generating ? "Preparing…" : "Build my prep"}
            </button>
            {generateError && <p role="alert" className="text-xs text-amber-800 dark:text-amber-300 flex-1">{generateError}</p>}
          </div>
        </div>
      </div>

      {preps.length > 1 && (
        <div className="surface">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="section-label">Earlier prep</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {preps.map((prep) => (
              <div key={prep.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {prep.mockQuestions.length} questions · {formatDate(prep.createdAt)}
                </p>
                <button
                  onClick={() => setViewingPrep(prep)}
                  className={`text-xs font-medium transition-colors ${
                    viewingPrep?.id === prep.id ? "text-primary-600" : "text-gray-500 hover:text-primary-600"
                  }`}
                >
                  {viewingPrep?.id === prep.id ? "Viewing" : "View"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
