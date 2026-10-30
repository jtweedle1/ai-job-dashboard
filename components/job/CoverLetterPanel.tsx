"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { authedFetch, noKeyMessage } from "@/lib/api-client";
import { aiErrorMessage } from "@/lib/ai-errors";
import { getResumes } from "@/lib/resumes";
import {
  getCoverLettersByJobId,
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
import Toast from "@/components/Toast";
import { useToast } from "@/lib/use-toast";
import { useDraft } from "@/lib/use-draft";
import { backgroundHeading } from "@/types/background";
import type { Background } from "@/types/background";
import type { Job } from "@/types/job";
import type { Resume } from "@/types/resume";
import type { CoverLetter, LetterClaim } from "@/types/coverLetter";
import { DEFAULT_VOICE_SETTINGS, type VoiceSettings } from "@/types/writingSample";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const fieldClass =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";
const ghostButton =
  "flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-full hover:bg-white dark:hover:bg-gray-800 transition-colors disabled:opacity-50";

// The Apply step of a job: write, check and polish the letter for this one role.
export default function CoverLetterPanel({
  job,
  onLettersChange,
}: {
  job: Job;
  onLettersChange?: (count: number) => void;
}) {
  const { user } = useAuth();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const { value: letterNotes, setValue: setLetterNotes } = useDraft(`letter-notes:${job.id}`, "", (v) => !v.trim());
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [checkingSources, setCheckingSources] = useState(false);
  const [sourcesError, setSourcesError] = useState("");

  const [viewingLetter, setViewingLetter] = useState<CoverLetter | null>(null);
  const [copied, setCopied] = useState(false);
  const [savingToBank, setSavingToBank] = useState(false);
  // Unsaved edits to a letter survive switching steps or reloading, until saved or cancelled.
  const edit = useDraft<{ letterId: string; text: string } | null>(`letter-edit:${job.id}`, null, (v) => v == null);
  const [savingEdit, setSavingEdit] = useState(false);
  const { show: showToast, toastProps } = useToast();

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getResumes(user.uid),
      getCoverLettersByJobId(user.uid, job.id),
      getBackgrounds(user.uid),
      getVoiceProfile(user.uid),
    ]).then(([r, l, b, v]) => {
      setResumes(r);
      setLetters(l);
      setBackgrounds(b);
      setVoiceSettings(v.settings);
      const used = job.resumeIdUsed && r.find((x) => x.id === job.resumeIdUsed);
      setSelectedResumeId(used ? used.id : r[0]?.id ?? "");
      setViewingLetter(l[0] ?? null);
      setLoading(false);
    });
  }, [user, job.id, job.resumeIdUsed]);

  function updateLetters(next: CoverLetter[]) {
    setLetters(next);
    onLettersChange?.(next.length);
  }


  async function handleGenerate() {
    if (!user || !selectedResumeId) return;
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await authedFetch("/api/cover-letter", {
        method: "POST",
        body: JSON.stringify({
          jobId: job.id,
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
        setGenerateError(aiErrorMessage(res.status, data.error, "Generation failed. Try again."));
        return;
      }
      const newLetter: CoverLetter = {
        id: data.id,
        jobId: job.id,
        resumeId: selectedResumeId,
        content: data.content,
        edited: false,
        useAsVoiceSample: false,
        claims: (data.claims as LetterClaim[] | null) ?? null,
        createdAt: new Date(),
      };
      updateLetters([newLetter, ...letters]);
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
        setSourcesError(aiErrorMessage(res.status, data.error, "The check failed. Try again."));
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

  const editing = edit.value != null && edit.value.letterId === viewingLetter?.id;
  const draft = editing ? edit.value!.text : "";

  async function handleSaveEdit() {
    if (!user || !viewingLetter || !draft.trim()) return;
    setSavingEdit(true);
    try {
      await updateCoverLetterContent(user.uid, viewingLetter.id, draft.trim());
      patchLetter(viewingLetter.id, { content: draft.trim(), edited: true, claims: null });
      edit.clear();
      showToast("Changes saved");
    } catch {
      showToast("Couldn't save your changes. They're kept here; try again.", { tone: "error" });
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
        question: `Cover letter — ${job.title}`,
        answer: viewingLetter.content,
        tags: ["cover-letter"],
        jobId: job.id,
      });
      showToast("Saved to Answers");
    } finally {
      setSavingToBank(false);
    }
  }

  // Gone from the page at once; really deleted only once the Undo toast has gone.
  function handleDelete(id: string) {
    if (!user) return;
    const uid = user.uid;
    const before = letters;
    const wasViewing = viewingLetter;
    const next = letters.filter((l) => l.id !== id);
    updateLetters(next);
    if (viewingLetter?.id === id) openLetter(next[0] ?? null);
    const restore = () => {
      updateLetters(before);
      openLetter(wasViewing);
    };
    showToast("Letter deleted", {
      undo: restore,
      commit: () =>
        void deleteCoverLetter(uid, id).catch(() => {
          restore();
          showToast("Couldn't delete that letter. Try again.", { tone: "error" });
        }),
    });
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

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-40 bg-white/60 dark:bg-gray-800 rounded-3xl" />
        <div className="h-64 bg-white/60 dark:bg-gray-800 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Toast {...toastProps} />

      {/* The letter itself comes first once there is one. */}
      {viewingLetter && (
        <div className="surface overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h2 className="section-label">Your letter</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {resumeLabel(viewingLetter.resumeId)} · {formatDate(viewingLetter.createdAt)}
                {viewingLetter.edited ? " · edited by you" : " · AI draft"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {!editing && (
                <button
                  onClick={() => edit.setValue({ letterId: viewingLetter.id, text: viewingLetter.content })}
                  className={ghostButton}
                >
                  <i className="ti ti-pencil text-xs" aria-hidden="true" />
                  Edit
                </button>
              )}
              <button onClick={handleSaveToBank} disabled={savingToBank} className={ghostButton}>
                {savingToBank ? (
                  <i className="ti ti-loader-2 animate-spin text-xs" aria-hidden="true" />
                ) : (
                  <i className="ti ti-bookmarks text-xs" aria-hidden="true" />
                )}
                Save to Answers
              </button>
              <button onClick={handleCopy} className={ghostButton}>
                <i className={`ti ${copied ? "ti-check text-primary-600" : "ti-copy"} text-xs`} aria-hidden="true" />
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => handleDelete(viewingLetter.id)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                aria-label="Delete cover letter"
              >
                <i className="ti ti-trash text-sm" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="px-5 py-5">
            {editing ? (
              <div className="space-y-3">
                {edit.restored && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Picked up the edits you hadn&apos;t saved yet.</p>
                )}
                <textarea
                  aria-label="Edit your letter"
                  value={draft}
                  onChange={(e) => edit.setValue({ letterId: viewingLetter.id, text: e.target.value })}
                  rows={14}
                  className={`${fieldClass} leading-relaxed resize-y`}
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={edit.clear}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-2 rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit || !draft.trim()}
                    className="bg-primary-600 text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50"
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
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={viewingLetter.useAsVoiceSample}
                onChange={(e) => handleToggleVoiceSample(e.target.checked)}
                className="mt-0.5 accent-primary-500"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Use as a voice sample for future letters
                {!viewingLetter.edited && (
                  <span className="block text-amber-800 dark:text-amber-300 mt-0.5">
                    This is still the AI draft. Edit it into your own words first so your voice doesn&apos;t drift.
                  </span>
                )}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Generator */}
      <div className="surface">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="section-label">{letters.length ? "Write another version" : "Write your letter"}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Drafted from your resume, your experience and your voice in Me.
          </p>
        </div>
        <div className="px-5 py-4">
          {resumes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Letters start from your resume.{" "}
              <Link href="/resumes" className="text-primary-600 hover:underline">
                Add a resume in Me
              </Link>{" "}
              and come back.
            </p>
          ) : (
            <div className="space-y-4">
              {resumes.length > 1 && (
                <div>
                  <label htmlFor="letter-resume" className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Resume</label>
                  <select
                    id="letter-resume"
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className={fieldClass}
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <p id="letter-stories" className="text-xs text-gray-500 dark:text-gray-400">Experience to draw from</p>
                  <Link
                    href="/background"
                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <i className="ti ti-briefcase text-xs" aria-hidden="true" />
                    {backgrounds.length ? "Edit your experience" : "Add your experience"}
                  </Link>
                </div>
                {backgrounds.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Write up the stories behind your past jobs once, and every letter will draw from them.
                  </p>
                ) : (
                  <div role="group" aria-labelledby="letter-stories" className="flex flex-wrap gap-2">
                    {backgrounds.map((b) => (
                      <label
                        key={b.id}
                        className={`flex items-center gap-2 cursor-pointer text-sm px-3 py-1.5 rounded-full border transition-colors ${
                          b.included
                            ? "border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950 text-primary-800 dark:text-primary-200"
                            : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={b.included}
                          onChange={(e) => handleToggleBackground(b.id, e.target.checked)}
                          className="accent-primary-500"
                        />
                        {backgroundHeading({ ...b, startDate: "", endDate: "" })}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="letter-notes" className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                  Notes for this letter <span className="text-gray-500 dark:text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="letter-notes"
                  value={letterNotes}
                  onChange={(e) => setLetterNotes(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="e.g. Mention I'm open to relocating. Focus on the Python work."
                  className={`${fieldClass} resize-y`}
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleGenerate}
                  disabled={generating || !selectedResumeId}
                  className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-sm shadow-primary-600/20 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
                  ) : (
                    <i className="ti ti-wand text-sm" aria-hidden="true" />
                  )}
                  {generating ? "Writing…" : letters.length ? "Write a new version" : "Write my letter"}
                </button>
                {generateError && <p role="alert" className="text-xs text-amber-800 dark:text-amber-300 flex-1">{generateError}</p>}
                <Link
                  href="/voice"
                  className="ml-auto flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600 transition-colors"
                >
                  <i className="ti ti-feather text-xs" aria-hidden="true" />
                  Tune your voice
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Earlier versions */}
      {letters.length > 1 && (
        <div className="surface">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="section-label">Earlier versions</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {letters.map((letter) => (
              <div key={letter.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {resumeLabel(letter.resumeId)} · {formatDate(letter.createdAt)}
                  {letter.edited ? " · edited" : ""}
                </p>
                <button
                  onClick={() => openLetter(letter)}
                  className={`text-xs font-medium transition-colors ${
                    viewingLetter?.id === letter.id ? "text-primary-600" : "text-gray-500 hover:text-primary-600"
                  }`}
                >
                  {viewingLetter?.id === letter.id ? "Viewing" : "View"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
