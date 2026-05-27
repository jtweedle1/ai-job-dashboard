"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getJobs } from "@/lib/jobs";
import { getResumes } from "@/lib/resumes";
import { getCoverLetters, deleteCoverLetter } from "@/lib/coverLetters";
import { createAnswer } from "@/lib/answerBank";
import type { Job } from "@/types/job";
import type { Resume } from "@/types/resume";
import type { CoverLetter } from "@/types/coverLetter";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function CoverLettersContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const [viewingLetter, setViewingLetter] = useState<CoverLetter | null>(null);
  const [copied, setCopied] = useState(false);
  const [savingToBank, setSavingToBank] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getJobs(user.uid),
      getResumes(user.uid),
      getCoverLetters(user.uid),
    ]).then(([j, r, l]) => {
      setJobs(j);
      setResumes(r);
      setLetters(l);
      const preJobId = searchParams.get("jobId");
      const validPreJob = preJobId && j.find((job) => job.id === preJobId);
      setSelectedJobId(validPreJob ? preJobId : j[0]?.id ?? "");
      setSelectedResumeId(r[0]?.id ?? "");
      setLoading(false);
    });
  }, [user, searchParams]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleGenerate() {
    if (!user || !selectedJobId || !selectedResumeId) return;
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, jobId: selectedJobId, resumeId: selectedResumeId }),
      });
      const data = await res.json();
      if (res.status === 401 || data.error === "no_key") {
        setGenerateError("Add your Anthropic API key in Settings to generate cover letters.");
        return;
      }
      if (data.error) {
        setGenerateError("Generation failed. Try again.");
        return;
      }
      const newLetter: CoverLetter = {
        id: data.id,
        jobId: selectedJobId,
        resumeId: selectedResumeId,
        content: data.content,
        createdAt: new Date(),
      };
      setLetters((prev) => [newLetter, ...prev]);
      setViewingLetter(newLetter);
      showToast("Cover letter generated");
    } catch {
      setGenerateError("Something went wrong. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!viewingLetter) return;
    await navigator.clipboard.writeText(viewingLetter.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveToBank() {
    if (!user || !viewingLetter) return;
    setSavingToBank(true);
    try {
      await createAnswer(user.uid, {
        question: `Cover letter — ${jobTitle(viewingLetter.jobId)}`,
        answer: viewingLetter.content,
        tags: ["cover-letter"],
        jobId: viewingLetter.jobId,
      });
      showToast("Saved to answer bank");
    } finally {
      setSavingToBank(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    setDeletingId(id);
    await deleteCoverLetter(user.uid, id);
    setLetters((prev) => prev.filter((l) => l.id !== id));
    if (viewingLetter?.id === id) setViewingLetter(null);
    setDeletingId(null);
    showToast("Deleted");
  }

  function jobTitle(jobId: string) {
    return jobs.find((j) => j.id === jobId)?.title ?? "Unknown job";
  }

  function jobCompany(jobId: string) {
    return jobs.find((j) => j.id === jobId)?.company ?? "";
  }

  function resumeLabel(resumeId: string) {
    return resumes.find((r) => r.id === resumeId)?.label ?? "Unknown resume";
  }

  const hasExistingForCombo = letters.some(
    (l) => l.jobId === selectedJobId && l.resumeId === selectedResumeId
  );

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-7 bg-gray-100 rounded w-48" />
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-xl" />
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
        <h1 className="text-lg font-semibold text-gray-900">Cover letters</h1>
        <p className="text-sm text-gray-500">
          {letters.length} letter{letters.length !== 1 ? "s" : ""}
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
          ) : resumes.length === 0 ? (
            <p className="text-sm text-gray-400">
              No resumes yet.{" "}
              <button
                onClick={() => router.push("/resumes")}
                className="text-emerald-600 hover:underline"
              >
                Add a resume
              </button>{" "}
              first.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="block text-xs text-gray-500 mb-1.5">Resume</label>
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleGenerate}
                  disabled={generating || !selectedJobId || !selectedResumeId}
                  className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
                  ) : (
                    <i className="ti ti-wand text-sm" aria-hidden="true" />
                  )}
                  {generating
                    ? "Generating…"
                    : hasExistingForCombo
                    ? "Regenerate"
                    : "Generate cover letter"}
                </button>
                {generateError && (
                  <p className="text-xs text-amber-600 flex-1">{generateError}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Viewing letter */}
      {viewingLetter && (
        <div className="bg-white border border-gray-100 rounded-xl mb-4">
          <div className="px-4 py-3 border-b border-gray-50 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {jobTitle(viewingLetter.jobId)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {jobCompany(viewingLetter.jobId)} · {resumeLabel(viewingLetter.resumeId)} ·{" "}
                {formatDate(viewingLetter.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSaveToBank}
                disabled={savingToBank}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {savingToBank ? (
                  <i className="ti ti-loader-2 animate-spin text-xs" aria-hidden="true" />
                ) : (
                  <i className="ti ti-bookmarks text-xs" aria-hidden="true" />
                )}
                Save to bank
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <i
                  className={`ti ${copied ? "ti-check text-emerald-600" : "ti-copy"} text-xs`}
                  aria-hidden="true"
                />
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => handleDelete(viewingLetter.id)}
                disabled={deletingId === viewingLetter.id}
                className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50"
                aria-label="Delete cover letter"
              >
                <i className="ti ti-trash text-sm" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="px-4 py-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {viewingLetter.content}
            </p>
          </div>
        </div>
      )}

      {/* Past letters list */}
      {letters.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">
              All letters
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {letters.map((letter) => (
              <div
                key={letter.id}
                className="px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {jobTitle(letter.jobId)}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {resumeLabel(letter.resumeId)} · {formatDate(letter.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setViewingLetter(letter)}
                    className={`text-xs font-medium transition-colors ${
                      viewingLetter?.id === letter.id
                        ? "text-emerald-600"
                        : "text-gray-400 hover:text-emerald-600"
                    }`}
                  >
                    {viewingLetter?.id === letter.id ? "Viewing" : "View"}
                  </button>
                  <button
                    onClick={() => handleDelete(letter.id)}
                    disabled={deletingId === letter.id}
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
      {letters.length === 0 && !loading && jobs.length > 0 && resumes.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <i className="ti ti-mail text-gray-400 text-xl" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500">No cover letters yet. Generate your first one above.</p>
        </div>
      )}
    </div>
  );
}

export default function CoverLettersPage() {
  return (
    <Suspense>
      <CoverLettersContent />
    </Suspense>
  );
}
