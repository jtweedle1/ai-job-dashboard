"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authedFetch } from "@/lib/api-client";
import { getJobs } from "@/lib/jobs";
import { getInterviewPreps, deleteInterviewPrep } from "@/lib/interviewPreps";
import { createAnswer } from "@/lib/answerBank";
import type { Job } from "@/types/job";
import type { InterviewPrep } from "@/types/interviewPrep";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function InterviewPrepContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [preps, setPreps] = useState<InterviewPrep[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedJobId, setSelectedJobId] = useState("");
  const [interviewProcess, setInterviewProcess] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const [viewingPrep, setViewingPrep] = useState<InterviewPrep | null>(null);
  const [savingQuestionIndex, setSavingQuestionIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([getJobs(user.uid), getInterviewPreps(user.uid)]).then(([j, p]) => {
      setJobs(j);
      setPreps(p);
      const preJobId = searchParams.get("jobId");
      const validPre = preJobId && j.find((job) => job.id === preJobId);
      setSelectedJobId(validPre ? preJobId : j[0]?.id ?? "");
      setLoading(false);
    });
  }, [user, searchParams]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleGenerate() {
    if (!user || !selectedJobId || !interviewProcess.trim()) return;
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await authedFetch("/api/interview-prep", {
        method: "POST",
        body: JSON.stringify({
          jobId: selectedJobId,
          interviewProcess: interviewProcess.trim(),
        }),
      });
      const data = await res.json();
      if (res.status === 401 || data.error === "no_key") {
        setGenerateError("Add your Anthropic API key in Settings to generate interview prep.");
        return;
      }
      if (data.error) {
        setGenerateError("Generation failed. Try again.");
        return;
      }
      const newPrep: InterviewPrep = {
        id: data.id,
        jobId: selectedJobId,
        interviewProcess: interviewProcess.trim(),
        mockQuestions: data.questions,
        studyTips: data.studyTips,
        createdAt: new Date(),
      };
      setPreps((prev) => [newPrep, ...prev]);
      setViewingPrep(newPrep);
      showToast("Interview prep generated");
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
    setPreps((prev) => prev.filter((p) => p.id !== id));
    if (viewingPrep?.id === id) setViewingPrep(null);
    setDeletingId(null);
    showToast("Deleted");
  }

  async function handleSaveQuestion(question: string, index: number) {
    if (!user || !viewingPrep) return;
    setSavingQuestionIndex(index);
    try {
      await createAnswer(user.uid, {
        question,
        answer: "",
        tags: ["interview-prep"],
        jobId: viewingPrep.jobId,
      });
      showToast("Question saved to answer bank");
    } finally {
      setSavingQuestionIndex(null);
    }
  }

  function jobTitle(jobId: string) {
    return jobs.find((j) => j.id === jobId)?.title ?? "Unknown job";
  }

  function jobCompany(jobId: string) {
    return jobs.find((j) => j.id === jobId)?.company ?? "";
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-7 bg-gray-100 rounded w-48" />
        <div className="h-40 bg-gray-100 rounded-xl" />
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
          <i className="ti ti-circle-check text-emerald-400 text-base" aria-hidden="true" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Interview prep</h1>
        <p className="text-sm text-gray-500">
          {preps.length} session{preps.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Generator */}
      <div className="bg-white border border-gray-100 rounded-xl mb-4">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Generate</p>
        </div>
        <div className="px-4 py-4">
          {jobs.length === 0 ? (
            <p className="text-sm text-gray-400">
              No jobs yet.{" "}
              <button
                onClick={() => router.push("/applications")}
                className="text-emerald-600 hover:underline"
              >
                Add a job
              </button>{" "}
              first.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Job</label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} — {j.company}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  Describe the interview process
                </label>
                <textarea
                  value={interviewProcess}
                  onChange={(e) => setInterviewProcess(e.target.value)}
                  placeholder="e.g. 2 rounds: first a 30-min recruiter screen, then a 60-min panel with the hiring manager and two engineers — mostly behavioral with some system design questions"
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleGenerate}
                  disabled={generating || !selectedJobId || !interviewProcess.trim()}
                  className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
                  ) : (
                    <i className="ti ti-wand text-sm" aria-hidden="true" />
                  )}
                  {generating ? "Generating…" : "Generate prep"}
                </button>
                {generateError && (
                  <p className="text-xs text-amber-600 flex-1">{generateError}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Viewing prep */}
      {viewingPrep && (
        <div className="bg-white border border-gray-100 rounded-xl mb-4">
          <div className="px-4 py-3 border-b border-gray-50 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {jobTitle(viewingPrep.jobId)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {jobCompany(viewingPrep.jobId)} · {formatDate(viewingPrep.createdAt)}
              </p>
            </div>
            <button
              onClick={() => handleDelete(viewingPrep.id)}
              disabled={deletingId === viewingPrep.id}
              className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50 shrink-0"
              aria-label="Delete prep"
            >
              <i className="ti ti-trash text-sm" aria-hidden="true" />
            </button>
          </div>

          {/* Process description */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">
              Process
            </p>
            <p className="text-sm text-gray-600 italic">{viewingPrep.interviewProcess}</p>
          </div>

          {/* Questions */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">
              Mock questions
            </p>
            <ol className="space-y-2">
              {viewingPrep.mockQuestions.map((q, i) => (
                <li key={i} className="flex gap-3 group">
                  <span className="text-xs font-semibold text-gray-300 w-5 shrink-0 pt-0.5">
                    {i + 1}.
                  </span>
                  <p className="text-sm text-gray-700 flex-1">{q}</p>
                  <button
                    onClick={() => handleSaveQuestion(q, i)}
                    disabled={savingQuestionIndex === i}
                    className="text-gray-200 hover:text-emerald-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 disabled:opacity-50"
                    aria-label="Save to answer bank"
                    title="Save to answer bank"
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

          {/* Study tips */}
          {viewingPrep.studyTips && (
            <div className="px-4 pt-3 pb-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">
                Study tips
              </p>
              <div className="space-y-1.5">
                {viewingPrep.studyTips.split("\n").filter(Boolean).map((tip, i) => (
                  <div key={i} className="flex gap-2">
                    <i className="ti ti-circle-check text-emerald-500 text-sm shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-gray-600">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Past sessions list */}
      {preps.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">
              All sessions
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {preps.map((prep) => (
              <div key={prep.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {jobTitle(prep.jobId)}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {prep.mockQuestions.length} questions · {formatDate(prep.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setViewingPrep(prep)}
                    className={`text-xs font-medium transition-colors ${
                      viewingPrep?.id === prep.id
                        ? "text-emerald-600"
                        : "text-gray-400 hover:text-emerald-600"
                    }`}
                  >
                    {viewingPrep?.id === prep.id ? "Viewing" : "View"}
                  </button>
                  <button
                    onClick={() => handleDelete(prep.id)}
                    disabled={deletingId === prep.id}
                    className="text-gray-200 hover:text-red-400 transition-colors disabled:opacity-50"
                    aria-label="Delete"
                  >
                    <i className="ti ti-trash text-xs" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {preps.length === 0 && !loading && jobs.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <i className="ti ti-microphone text-gray-400 text-xl" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500">
            No prep sessions yet. Describe the process above and generate your first one.
          </p>
        </div>
      )}
    </div>
  );
}

export default function InterviewPrepPage() {
  return (
    <Suspense>
      <InterviewPrepContent />
    </Suspense>
  );
}
