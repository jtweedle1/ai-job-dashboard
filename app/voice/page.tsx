"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { authedFetch } from "@/lib/api-client";
import {
  getWritingSamples,
  createWritingSample,
  setWritingSampleIncluded,
  deleteWritingSample,
  getVoiceProfile,
  saveVoiceProfile,
  saveVoiceSettings,
} from "@/lib/writingSamples";
import { computeVoiceStats } from "@/lib/voice-stats";
import { DEFAULT_VOICE_SETTINGS } from "@/types/writingSample";
import { getCoverLetters, setCoverLetterVoiceSample } from "@/lib/coverLetters";
import { getAnswers, updateAnswer } from "@/lib/answerBank";
import { getJobs } from "@/lib/jobs";
import type { WritingSample, WritingSampleKind, VoiceSettings, LetterFormat } from "@/types/writingSample";
import type { CoverLetter } from "@/types/coverLetter";
import type { AnswerEntry } from "@/types/answerBank";
import type { Job } from "@/types/job";

type Tab = "paste" | "pdf";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Badge({ tone, children }: { tone: "emerald" | "amber"; children: React.ReactNode }) {
  const cls =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950"
      : "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950";
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {children}
    </span>
  );
}

const cardClass = "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl mb-4";
const cardHeaderClass = "px-4 py-3 border-b border-gray-50 dark:border-gray-800";
const cardTitleClass = "text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest";
const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800";
const primaryButtonClass =
  "flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryButtonClass =
  "flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50";

export default function VoicePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [samples, setSamples] = useState<WritingSample[]>([]);
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [answers, setAnswers] = useState<AnswerEntry[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [profile, setProfile] = useState("");
  const [savedProfile, setSavedProfile] = useState("");
  const [profileUpdatedAt, setProfileUpdatedAt] = useState<Date | null>(null);
  const [generating, setGenerating] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);

  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<Tab>("paste");
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<WritingSampleKind>("cover_letter");
  const [content, setContent] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [savingSample, setSavingSample] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getWritingSamples(user.uid),
      getCoverLetters(user.uid),
      getAnswers(user.uid),
      getJobs(user.uid),
      getVoiceProfile(user.uid),
    ]).then(([s, l, a, j, p]) => {
      setSamples(s);
      setLetters(l);
      setAnswers(a);
      setJobs(j);
      setProfile(p.content);
      setSavedProfile(p.content);
      setProfileUpdatedAt(p.updatedAt);
      setSettings(p.settings);
      setSavedSettings(p.settings);
      setLoading(false);
    });
  }, [user]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function jobLabel(jobId: string | null) {
    const job = jobs.find((j) => j.id === jobId);
    return job ? `${job.title} — ${job.company}` : "Unknown job";
  }

  const includedCount =
    samples.filter((s) => s.included).length +
    letters.filter((l) => l.useAsVoiceSample).length +
    answers.filter((a) => a.useAsVoiceSample).length;

  async function handleGenerateProfile() {
    if (!user) return;
    setGenerating(true);
    setProfileError("");
    try {
      const res = await authedFetch("/api/voice-profile", { method: "POST" });
      const data = await res.json();
      if (res.status === 401 || data.error === "no_key") {
        setProfileError("Add your Anthropic API key in Settings to build a voice profile.");
        return;
      }
      if (data.error === "no_samples") {
        setProfileError("Include at least one writing sample first.");
        return;
      }
      if (data.error) {
        setProfileError("Couldn't build your profile. Try again.");
        return;
      }
      await saveVoiceProfile(user.uid, data.content);
      setProfile(data.content);
      setSavedProfile(data.content);
      setProfileUpdatedAt(new Date());
      showToast("Voice profile updated");
    } catch {
      setProfileError("Something went wrong. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveProfile() {
    if (!user) return;
    setSavingProfile(true);
    try {
      await saveVoiceProfile(user.uid, profile.trim());
      setSavedProfile(profile.trim());
      setProfileUpdatedAt(new Date());
      showToast("Voice profile saved");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveSettings() {
    if (!user) return;
    setSavingSettings(true);
    try {
      await saveVoiceSettings(user.uid, settings);
      setSavedSettings(settings);
      showToast("Preferences saved");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handlePdfSelect(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setParseError("File exceeds the 5 MB limit. Please use a smaller PDF.");
      return;
    }
    setPdfName(file.name);
    setParseError("");
    setParsing(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await authedFetch("/api/parse-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (data.text) {
        setContent(data.text);
        if (!label.trim()) setLabel(file.name.replace(/\.pdf$/i, ""));
      } else {
        setParseError(data.error ?? "Could not extract text from PDF.");
      }
    } catch {
      setParseError("Failed to contact the parser. Try pasting text instead.");
    } finally {
      setParsing(false);
    }
  }

  function resetForm() {
    setAdding(false);
    setTab("paste");
    setLabel("");
    setKind("cover_letter");
    setContent("");
    setPdfName("");
    setParseError("");
  }

  async function handleAddSample() {
    if (!user || !label.trim() || !content.trim()) return;
    setSavingSample(true);
    try {
      const data = { label: label.trim(), content: content.trim(), kind, included: true };
      const id = await createWritingSample(user.uid, data);
      setSamples((prev) => [{ id, ...data, createdAt: new Date() }, ...prev]);
      resetForm();
      showToast("Sample added");
    } finally {
      setSavingSample(false);
    }
  }

  async function toggleSample(sample: WritingSample, included: boolean) {
    if (!user) return;
    setSamples((prev) => prev.map((s) => (s.id === sample.id ? { ...s, included } : s)));
    await setWritingSampleIncluded(user.uid, sample.id, included);
  }

  async function toggleLetter(letter: CoverLetter, useAsVoiceSample: boolean) {
    if (!user) return;
    setLetters((prev) => prev.map((l) => (l.id === letter.id ? { ...l, useAsVoiceSample } : l)));
    await setCoverLetterVoiceSample(user.uid, letter.id, useAsVoiceSample);
  }

  async function toggleAnswer(answer: AnswerEntry, useAsVoiceSample: boolean) {
    if (!user) return;
    setAnswers((prev) => prev.map((a) => (a.id === answer.id ? { ...a, useAsVoiceSample } : a)));
    await updateAnswer(user.uid, answer.id, { useAsVoiceSample });
  }

  async function handleDeleteSample(id: string) {
    if (!user) return;
    await deleteWritingSample(user.uid, id);
    setSamples((prev) => prev.filter((s) => s.id !== id));
    setDeleteConfirm(null);
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-7 bg-gray-100 dark:bg-gray-800 rounded w-48" />
        <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
    );
  }

  const profileDirty = profile.trim() !== savedProfile;
  const settingsDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  // Same measurements the server uses, so users can see what "match my samples" means.
  const includedLetterTexts = [
    ...samples.filter((s) => s.included && s.kind === "cover_letter").map((s) => s.content),
    ...letters.filter((l) => l.useAsVoiceSample).map((l) => l.content),
  ];
  const stats = includedLetterTexts.length ? computeVoiceStats(includedLetterTexts) : null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
          <i className="ti ti-circle-check text-emerald-400 text-base" aria-hidden="true" />
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">My voice</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Cover letters are written to sound like you, based only on the writing you include here.
        </p>
      </div>

      {/* Voice profile */}
      <div className={cardClass}>
        <div className={`${cardHeaderClass} flex items-center justify-between gap-4`}>
          <p className={cardTitleClass}>Voice profile</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {includedCount} sample{includedCount !== 1 ? "s" : ""} included
            {profileUpdatedAt && ` · updated ${formatDate(profileUpdatedAt)}`}
          </p>
        </div>
        <div className="px-4 py-4 space-y-3">
          <textarea
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            placeholder="Add a few writing samples below, then build your profile. You can edit it afterwards."
            rows={profile ? 10 : 4}
            className={`${inputClass} resize-y`}
          />
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleGenerateProfile}
              disabled={generating || includedCount === 0}
              className={primaryButtonClass}
            >
              <i
                className={`ti ${generating ? "ti-loader-2 animate-spin" : "ti-wand"} text-sm`}
                aria-hidden="true"
              />
              {generating ? "Reading your samples…" : savedProfile ? "Rebuild from samples" : "Build profile"}
            </button>
            {profileDirty && (
              <button onClick={handleSaveProfile} disabled={savingProfile} className={secondaryButtonClass}>
                {savingProfile ? "Saving…" : "Save edits"}
              </button>
            )}
            {profileError && <p className="text-xs text-amber-600 flex-1">{profileError}</p>}
          </div>
          {savedProfile && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Rebuilding replaces your edits. Rebuild after you change which samples are included.
            </p>
          )}
        </div>
      </div>

      {/* Preferences */}
      <div className={cardClass}>
        <div className={`${cardHeaderClass} flex items-center justify-between gap-4`}>
          <p className={cardTitleClass}>Preferences</p>
          {stats && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Your letters: ~{stats.medianWords} words · {stats.medianParagraphs} paragraphs ·{" "}
              {stats.contractionsPer100Words >= 1 ? "uses contractions" : "few contractions"}
            </p>
          )}
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Length (words)</label>
              <input
                type="number"
                min={50}
                max={800}
                value={settings.targetWords ?? ""}
                onChange={(e) =>
                  setSettings({ ...settings, targetWords: e.target.value ? Number(e.target.value) : null })
                }
                placeholder={stats ? `Match my letters (~${stats.medianWords})` : "Match my letters"}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Format</label>
              <select
                value={settings.format}
                onChange={(e) => setSettings({ ...settings, format: e.target.value as LetterFormat })}
                className={inputClass}
              >
                <option value="full">Full letter (greeting and sign-off)</option>
                <option value="body">Body only</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              Things to weave in when relevant
            </label>
            <textarea
              value={settings.alwaysMention}
              onChange={(e) => setSettings({ ...settings, alwaysMention: e.target.value })}
              rows={3}
              placeholder="Side projects, a story about how you got started, values you want to come through, a closing line you love…"
              className={`${inputClass} resize-y`}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Never say</label>
            <textarea
              value={settings.neverSay}
              onChange={(e) => setSettings({ ...settings, neverSay: e.target.value })}
              rows={2}
              placeholder="One phrase per line, e.g. leverage, synergy"
              className={`${inputClass} resize-y`}
            />
          </div>
          {settingsDirty && (
            <div className="flex justify-end">
              <button onClick={handleSaveSettings} disabled={savingSettings} className={primaryButtonClass}>
                {savingSettings ? "Saving…" : "Save preferences"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Writing samples */}
      <div className={cardClass}>
        <div className={`${cardHeaderClass} flex items-center justify-between gap-4`}>
          <p className={cardTitleClass}>Writing samples</p>
          {!adding && (
            <button onClick={() => setAdding(true)} className={secondaryButtonClass}>
              <i className="ti ti-plus text-xs" aria-hidden="true" />
              Add sample
            </button>
          )}
        </div>

        {adding && (
          <div className="px-4 py-4 space-y-3 border-b border-gray-50 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cover letters you wrote yourself work best. Emails, essays, or posts help too.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Letter to Acme, 2025"
                className={inputClass}
              />
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as WritingSampleKind)}
                className={inputClass}
              >
                <option value="cover_letter">Cover letter</option>
                <option value="other">Other writing</option>
              </select>
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(["paste", "pdf"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md transition-colors ${
                    tab === t
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <i className={`ti ${t === "paste" ? "ti-align-left" : "ti-file-type-pdf"} text-sm`} aria-hidden="true" />
                  {t === "paste" ? "Paste text" : "Upload PDF"}
                </button>
              ))}
            </div>
            {tab === "pdf" && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-5 text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePdfSelect(file);
                  }}
                />
                <i className="ti ti-upload text-2xl text-gray-300 dark:text-gray-600 mb-2 block" aria-hidden="true" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {parsing ? "Extracting text…" : pdfName || "Click to select a PDF"}
                </p>
              </div>
            )}
            {parseError && <p className="text-xs text-red-500">{parseError}</p>}
            {(tab === "paste" || content) && (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste something you wrote…"
                rows={8}
                className={`${inputClass} resize-y`}
              />
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={resetForm}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSample}
                disabled={savingSample || !label.trim() || !content.trim()}
                className={primaryButtonClass}
              >
                {savingSample ? "Saving…" : "Add sample"}
              </button>
            </div>
          </div>
        )}

        {samples.length === 0 && !adding ? (
          <p className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">
            No samples yet. Add two or three things you&apos;ve written to get started.
          </p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {samples.map((s) => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${s.included ? "text-gray-900 dark:text-gray-50" : "text-gray-400 dark:text-gray-500"}`}>
                    {s.label}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {s.kind === "cover_letter" ? "Cover letter" : "Other writing"} · {formatDate(s.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {deleteConfirm === s.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Delete?</span>
                      <button onClick={() => handleDeleteSample(s.id)} className="text-xs font-medium text-red-500 hover:text-red-600">
                        Yes
                      </button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-400 hover:text-gray-600">
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(s.id)}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors"
                      aria-label="Delete sample"
                    >
                      <i className="ti ti-trash text-sm" aria-hidden="true" />
                    </button>
                  )}
                  <Toggle checked={s.included} onChange={(v) => toggleSample(s, v)} label={`Include ${s.label}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past cover letters (opt-in) */}
      <div className={cardClass}>
        <div className={cardHeaderClass}>
          <p className={cardTitleClass}>Past cover letters</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 normal-case">
            Off by default. Only include letters you&apos;ve edited into your own words, so AI drafts don&apos;t drift your voice.
          </p>
        </div>
        {letters.length === 0 ? (
          <p className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">No cover letters yet.</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {letters.map((l) => (
              <div key={l.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{jobLabel(l.jobId)}</p>
                    {l.edited ? <Badge tone="emerald">Edited by you</Badge> : <Badge tone="amber">AI draft</Badge>}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(l.createdAt)}</p>
                </div>
                <Toggle checked={l.useAsVoiceSample} onChange={(v) => toggleLetter(l, v)} label="Use as voice sample" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Answer bank (opt-in) */}
      <div className={cardClass}>
        <div className={cardHeaderClass}>
          <p className={cardTitleClass}>Answer bank</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 normal-case">
            Off by default. Turn on answers you wrote yourself.
          </p>
        </div>
        {answers.length === 0 ? (
          <p className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">No saved answers yet.</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {answers.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{a.question}</p>
                    {a.tags.includes("cover-letter") && <Badge tone="amber">AI draft</Badge>}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{a.answer}</p>
                </div>
                <Toggle checked={a.useAsVoiceSample} onChange={(v) => toggleAnswer(a, v)} label="Use as voice sample" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
