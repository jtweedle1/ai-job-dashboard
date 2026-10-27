"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { authedFetch, noKeyMessage } from "@/lib/api-client";
import { getInterviewPrepsByJobId, deleteInterviewPrep } from "@/lib/interviewPreps";
import { createAnswer } from "@/lib/answerBank";
import Toast from "@/components/Toast";
import type { Job } from "@/types/job";
import type { InterviewPrep } from "@/types/interviewPrep";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

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

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleGenerate() {
    if (!user || !interviewProcess.trim()) return;
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
        setGenerateError("Generation failed. Try again.");
        return;
      }
      const newPrep: InterviewPrep = {
        id: data.id,
        jobId: job.id,
        interviewProcess: interviewProcess.trim(),
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

  async function handleDelete(id: string) {
    if (!user) return;
    setDeletingId(id);
    await deleteInterviewPrep(user.uid, id);
    const next = preps.filter((p) => p.id !== id);
    updatePreps(next);
    if (viewingPrep?.id === id) setViewingPrep(next[0] ?? null);
    setDeletingId(null);
    showToast("Deleted");
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
      <Toast message={toast} />

      {viewingPrep && (
        <div className="surface overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="section-label">Your prep</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(viewingPrep.createdAt)}</p>
            </div>
            <button
              onClick={() => handleDelete(viewingPrep.id)}
              disabled={deletingId === viewingPrep.id}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50 shrink-0"
              aria-label="Delete prep"
            >
              <i className="ti ti-trash text-sm" aria-hidden="true" />
            </button>
          </div>

          <div className="px-5 pt-4">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">The process</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 italic">{viewingPrep.interviewProcess}</p>
          </div>

          <div className="px-5 pt-4">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">Practice questions</p>
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
                    className="text-gray-300 dark:text-gray-600 hover:text-primary-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 mt-0.5 disabled:opacity-50"
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
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">Study tips</p>
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
          <p className="section-label">{preps.length ? "Prep for another round" : "Prep for the interview"}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Describe the round and get practice questions built from this job description.
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <textarea
            value={interviewProcess}
            onChange={(e) => setInterviewProcess(e.target.value)}
            placeholder="e.g. 2 rounds: first a 30-min recruiter screen, then a 60-min panel with the hiring manager and two engineers — mostly behavioral with some system design questions"
            rows={3}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none bg-white dark:bg-gray-800"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleGenerate}
              disabled={generating || !interviewProcess.trim()}
              className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-sm shadow-primary-600/20 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
              ) : (
                <i className="ti ti-wand text-sm" aria-hidden="true" />
              )}
              {generating ? "Preparing…" : "Build my prep"}
            </button>
            {generateError && <p className="text-xs text-amber-600 flex-1">{generateError}</p>}
          </div>
        </div>
      </div>

      {preps.length > 1 && (
        <div className="surface">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <p className="section-label">Earlier prep</p>
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
                    viewingPrep?.id === prep.id ? "text-primary-600" : "text-gray-400 hover:text-primary-600"
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
