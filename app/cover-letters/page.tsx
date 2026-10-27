"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authedFetch, noKeyMessage } from "@/lib/api-client";
import { getJobs } from "@/lib/jobs";
import { getResumes } from "@/lib/resumes";
import {
  getCoverLetters,
  deleteCoverLetter,
  updateCoverLetterContent,
  setCoverLetterVoiceSample,
} from "@/lib/coverLetters";
import { createAnswer } from "@/lib/answerBank";
import { getBackgrounds, setBackgroundIncluded } from "@/lib/backgrounds";
import { getVoiceProfile } from "@/lib/writingSamples";
import { parseBannedPhrases } from "@/lib/banned-phrases";
import { letterQualityChecks } from "@/lib/letter-quality";
import LetterReview, { HighlightedLetter } from "@/components/LetterReview";
import { backgroundHeading } from "@/types/background";
import type { Background } from "@/types/background";
import type { Job } from "@/types/job";
import type { Resume } from "@/types/resume";
import type { CoverLetter, LetterClaim } from "@/types/coverLetter";
import { DEFAULT_VOICE_SETTINGS, type VoiceSettings } from "@/types/writingSample";

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
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [letterNotes, setLetterNotes] = useState("");
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [checkingSources, setCheckingSources] = useState(false);
  const [sourcesError, setSourcesError] = useState("");

  const [viewingLetter, setViewingLetter] = useState<CoverLetter | null>(null);
  const [copied, setCopied] = useState(false);
  const [savingToBank, setSavingToBank] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getJobs(user.uid),
      getResumes(user.uid),
      getCoverLetters(user.uid),
      getBackgrounds(user.uid),
      getVoiceProfile(user.uid),
    ]).then(([j, r, l, b, v]) => {
      setJobs(j);
      setResumes(r);
      setLetters(l);
      setBackgrounds(b);
      setVoiceSettings(v.settings);
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
      const res = await authedFetch("/api/cover-letter", {
        method: "POST",
        body: JSON.stringify({
          jobId: selectedJobId,
          resumeId: selectedResumeId,
          backgroundIds: backgrounds.filter((b) => b.included).map((b) => b.id),
          notes: letterNotes,
        }),
      });
      const data = await res.json();
      if (res.status === 401 || data.error === "no_key") {
        setGenerateError(noKeyMessage("generate cover letters"));
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
        edited: false,
        useAsVoiceSample: false,
        claims: (data.claims as LetterClaim[] | null) ?? null,
        createdAt: new Date(),
      };
      setLetters((prev) => [newLetter, ...prev]);
      openLetter(newLetter);
      const left: string[] = data.bannedPhrasesLeft ?? [];
      showToast(left.length ? "Generated, but check the flagged words" : "Cover letter generated");
    } catch {
      setGenerateError("Something went wrong. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  // Saved on the position so the choice carries over to the next letter.
  async function handleToggleBackground(id: string, included: boolean) {
    if (!user) return;
    setBackgrounds((prev) => prev.map((b) => (b.id === id ? { ...b, included } : b)));
    await setBackgroundIncluded(user.uid, id, included);
  }

  function openLetter(letter: CoverLetter | null) {
    setViewingLetter(letter);
    setEditing(false);
    setSourcesError("");
  }

  async function handleCheckSources() {
    if (!viewingLetter) return;
    const letterId = viewingLetter.id;
    setCheckingSources(true);
    setSourcesError("");
    try {
      const res = await authedFetch("/api/letter-claims", {
        method: "POST",
        body: JSON.stringify({ letterId }),
      });
      const data = await res.json();
      if (res.status === 401 || data.error === "no_key") {
        setSourcesError(noKeyMessage("check sources"));
        return;
      }
      if (data.error) {
        setSourcesError("The check failed. Try again.");
        return;
      }
      patchLetter(letterId, { claims: data.claims as LetterClaim[] });
    } catch {
      setSourcesError("Something went wrong. Try again.");
    } finally {
      setCheckingSources(false);
    }
  }

  function patchLetter(id: string, patch: Partial<CoverLetter>) {
    setLetters((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setViewingLetter((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  }

  async function handleSaveEdit() {
    if (!user || !viewingLetter || !draft.trim()) return;
    setSavingEdit(true);
    try {
      await updateCoverLetterContent(user.uid, viewingLetter.id, draft.trim());
      patchLetter(viewingLetter.id, { content: draft.trim(), edited: true, claims: null });
      setEditing(false);
      showToast("Changes saved");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleVoiceSample(useAsVoiceSample: boolean) {
    if (!user || !viewingLetter) return;
    patchLetter(viewingLetter.id, { useAsVoiceSample });
    await setCoverLetterVoiceSample(user.uid, viewingLetter.id, useAsVoiceSample);
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
    if (viewingLetter?.id === id) openLetter(null);
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

  const bannedPhrases = useMemo(() => parseBannedPhrases(voiceSettings.neverSay), [voiceSettings.neverSay]);
  const checks = useMemo(
    () =>
      viewingLetter
        ? letterQualityChecks(viewingLetter.content, {
            bannedPhrases,
            targetWords: voiceSettings.targetWords,
            claims: viewingLetter.claims,
          })
        : [],
    [viewingLetter, bannedPhrases, voiceSettings.targetWords]
  );

  const hasExistingForCombo = letters.some(
    (l) => l.jobId === selectedJobId && l.resumeId === selectedResumeId
  );

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-7 bg-gray-100 dark:bg-gray-800 rounded w-48" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
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
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Cover letters</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {letters.length} letter{letters.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Generator */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl mb-4">
        <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">Generate</p>
        </div>
        <div className="px-4 py-4">
          {jobs.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
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
            <p className="text-sm text-gray-400 dark:text-gray-500">
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
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Job</label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} — {j.company}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Resume</label>
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <label className="block text-xs text-gray-500 dark:text-gray-400">Background to draw from</label>
                  <button
                    onClick={() => router.push("/background")}
                    className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-emerald-600 transition-colors"
                  >
                    <i className="ti ti-briefcase text-xs" aria-hidden="true" />
                    {backgrounds.length ? "Edit background" : "Add your background"}
                  </button>
                </div>
                {backgrounds.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Write up the stories behind your past jobs once, and letters will draw from them.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {backgrounds.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={b.included}
                          onChange={(e) => handleToggleBackground(b.id, e.target.checked)}
                          className="accent-emerald-500"
                        />
                        {backgroundHeading({ ...b, startDate: "", endDate: "" })}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                  Notes for this letter <span className="text-gray-400 dark:text-gray-500">(optional)</span>
                </label>
                <textarea
                  value={letterNotes}
                  onChange={(e) => setLetterNotes(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="e.g. Mention I'm open to relocating. Focus on the Python work."
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-y"
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleGenerate}
                  disabled={generating || !selectedJobId || !selectedResumeId}
                  className="flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                <button
                  onClick={() => router.push("/voice")}
                  className="ml-auto flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-emerald-600 transition-colors"
                >
                  <i className="ti ti-feather text-xs" aria-hidden="true" />
                  Tune your voice
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Viewing letter */}
      {viewingLetter && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl mb-4">
          <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                {jobTitle(viewingLetter.jobId)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {jobCompany(viewingLetter.jobId)} · {resumeLabel(viewingLetter.resumeId)} ·{" "}
                {formatDate(viewingLetter.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!editing && (
                <button
                  onClick={() => {
                    setDraft(viewingLetter.content);
                    setEditing(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <i className="ti ti-pencil text-xs" aria-hidden="true" />
                  Edit
                </button>
              )}
              <button
                onClick={handleSaveToBank}
                disabled={savingToBank}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
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
                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
                aria-label="Delete cover letter"
              >
                <i className="ti ti-trash text-sm" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="px-4 py-4">
            {editing ? (
              <div className="space-y-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={14}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 resize-y"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit || !draft.trim()}
                    className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    {savingEdit ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            ) : (
              <HighlightedLetter content={viewingLetter.content} claims={viewingLetter.claims} />
            )}
          </div>
          {!editing && (
            <LetterReview
              claims={viewingLetter.claims}
              checks={checks}
              checking={checkingSources}
              checkError={sourcesError}
              onCheckSources={handleCheckSources}
            />
          )}
          <div className="px-4 py-3 border-t border-gray-50 dark:border-gray-800">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={viewingLetter.useAsVoiceSample}
                onChange={(e) => handleToggleVoiceSample(e.target.checked)}
                className="mt-0.5 accent-emerald-500"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Use as a voice sample for future letters
                {!viewingLetter.edited && (
                  <span className="block text-amber-600 dark:text-amber-500 mt-0.5">
                    This is still the AI draft. Edit it into your own words first so your voice doesn&apos;t drift.
                  </span>
                )}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Past letters list */}
      {letters.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              All letters
            </p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {letters.map((letter) => (
              <div
                key={letter.id}
                className="px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                    {jobTitle(letter.jobId)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {resumeLabel(letter.resumeId)} · {formatDate(letter.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => openLetter(letter)}
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
                    className="text-gray-200 dark:text-gray-700 hover:text-red-400 transition-colors disabled:opacity-50"
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
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <i className="ti ti-mail text-gray-400 dark:text-gray-500 text-xl" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">No cover letters yet. Generate your first one above.</p>
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
