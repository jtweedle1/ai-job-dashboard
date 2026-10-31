"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { authedFetch, noKeyMessage } from "@/lib/api-client";
import { aiErrorMessage } from "@/lib/ai-errors";
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
import { parseBannedPhrases } from "@/lib/banned-phrases";
import { DEFAULT_VOICE_SETTINGS } from "@/types/writingSample";
import { getCoverLetters, setCoverLetterVoiceSample } from "@/lib/coverLetters";
import { getAnswers, updateAnswer } from "@/lib/answerBank";
import { getJobs } from "@/lib/jobs";
import Toggle from "@/components/Toggle";
import type { WritingSample, WritingSampleKind, VoiceSettings, LetterFormat } from "@/types/writingSample";
import type { CoverLetter } from "@/types/coverLetter";
import type { AnswerEntry } from "@/types/answerBank";
import type { Job } from "@/types/job";
import Toast from "@/components/Toast";
import { useToast } from "@/lib/use-toast";
import PageFrame from "@/components/ui/PageFrame";
import Button, { IconButton } from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Dialog from "@/components/ui/Dialog";
import { Field, Input, TextArea } from "@/components/ui/Field";
import { InlineMessage, LoadingBlocks, Section } from "@/components/ui/bits";

type Tab = "paste" | "pdf";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// A short note on where a piece of writing came from. Words, not color, carry the meaning.
function Origin({ edited }: { edited: boolean }) {
  return edited ? (
    <span className="text-meta font-semibold text-moss">Edited by you</span>
  ) : (
    <span className="text-meta font-semibold text-caution">First draft</span>
  );
}

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
  const { show: showToast, toastProps } = useToast();

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


  function jobLabel(jobId: string | null) {
    const job = jobs.find((j) => j.id === jobId);
    return job ? `${job.title} at ${job.company}` : "Unknown job";
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
        setProfileError(noKeyMessage("build a voice profile"));
        return;
      }
      if (data.error === "no_samples") {
        setProfileError("Include at least one writing sample first.");
        return;
      }
      if (data.error) {
        setProfileError(aiErrorMessage(res.status, data.error, "Couldn't build your profile. Try again."));
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
    showToast("Sample deleted");
  }

  if (loading) {
    return (
      <PageFrame title="Your voice">
        <LoadingBlocks rows={3} label="Loading your voice" />
      </PageFrame>
    );
  }

  const profileDirty = profile.trim() !== savedProfile;
  const settingsDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);
  const bannedCount = parseBannedPhrases(settings.neverSay).length;

  // Same measurements the server uses, so users can see what "match my samples" means.
  const includedLetterTexts = [
    ...samples.filter((s) => s.included && s.kind === "cover_letter").map((s) => s.content),
    ...letters.filter((l) => l.useAsVoiceSample).map((l) => l.content),
  ];
  const stats = includedLetterTexts.length ? computeVoiceStats(includedLetterTexts) : null;

  const confirming = samples.find((x) => x.id === deleteConfirm);
  const row = "flex items-center gap-4 py-3 border-b border-rule last:border-b-0";

  return (
    <PageFrame title="Your voice" intro="Letters are written to sound like you, based only on the writing you include here.">
      <Toast {...toastProps} />

      <div className="space-y-14">
        <Section
          title="Voice profile"
          serif
          id="profile"
          action={
            <span className="text-meta text-ink-muted">
              {includedCount} sample{includedCount !== 1 ? "s" : ""} included
              {profileUpdatedAt && ` · updated ${formatDate(profileUpdatedAt)}`}
            </span>
          }
        >
          <TextArea
            aria-label="Your voice profile"
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            placeholder="Add a few writing samples below, then build your profile. You can edit it afterwards."
            rows={profile ? 10 : 4}
            className="text-reading"
          />
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <Button
              variant={savedProfile ? "secondary" : "primary"}
              icon="ti-wand"
              onClick={handleGenerateProfile}
              disabled={includedCount === 0}
              loading={generating}
              loadingLabel="Reading your samples…"
            >
              {savedProfile ? "Rebuild from samples" : "Build my profile"}
            </Button>
            {profileDirty && (
              <Button variant="primary" onClick={handleSaveProfile} loading={savingProfile} loadingLabel="Saving…">
                Save edits
              </Button>
            )}
          </div>
          {savedProfile && <p className="mt-3 text-meta text-ink-soft">Rebuilding replaces your edits. Rebuild after you change which samples are included.</p>}
          {profileError && (
            <InlineMessage tone="caution" role="alert" className="mt-4">
              {profileError}
            </InlineMessage>
          )}
        </Section>

        <Section
          title="Preferences"
          serif
          id="preferences"
          action={
            stats && (
              <span className="text-meta text-ink-muted text-right">
                Your letters: about {stats.medianWords} words, {stats.medianParagraphs} paragraphs,{" "}
                {stats.contractionsPer100Words >= 1 ? "uses contractions" : "few contractions"}
              </span>
            )
          }
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
              <Field id="voice-length" label="Length in words" optional>
                <Input
                  id="voice-length"
                  type="number"
                  min={50}
                  max={800}
                  value={settings.targetWords ?? ""}
                  onChange={(e) => setSettings({ ...settings, targetWords: e.target.value ? Number(e.target.value) : null })}
                  placeholder={stats ? `Match my letters (about ${stats.medianWords})` : "Match my letters"}
                />
              </Field>
              <Field id="voice-format" label="Format">
                <Select
                  id="voice-format"
                  value={settings.format}
                  options={[
                    { value: "full" as LetterFormat, label: "Full letter, with greeting and sign-off" },
                    { value: "body" as LetterFormat, label: "Body only" },
                  ]}
                  onChange={(format) => setSettings({ ...settings, format })}
                />
              </Field>
            </div>
            <Field id="voice-weave" label="Things to weave in when they fit" optional>
              <TextArea
                id="voice-weave"
                value={settings.alwaysMention}
                onChange={(e) => setSettings({ ...settings, alwaysMention: e.target.value })}
                rows={3}
                placeholder="Side projects, a story about how you got started, values you want to come through, a closing line you love…"
              />
            </Field>
            <Field id="voice-guidelines" label="Guidelines" optional>
              <TextArea
                id="voice-guidelines"
                value={settings.guidelines}
                onChange={(e) => setSettings({ ...settings, guidelines: e.target.value })}
                rows={settings.guidelines ? 8 : 3}
                placeholder={"How every letter should be written. For example:\n* Open with how I found the role, not with excitement\n* Back every trait with a concrete example\n* End with a specific ask, not a generic closing"}
              />
            </Field>
            <Field
              id="voice-avoid"
              label="Words to avoid"
              optional
              help={
                bannedCount > 0
                  ? `${bannedCount} phrase${bannedCount !== 1 ? "s" : ""} checked after every letter. If one slips in, the letter is rewritten once without it.`
                  : "If a letter still uses one, it's rewritten once without it."
              }
            >
              <TextArea
                id="voice-avoid"
                value={settings.neverSay}
                onChange={(e) => setSettings({ ...settings, neverSay: e.target.value })}
                rows={settings.neverSay ? 8 : 3}
                placeholder={"Comma lists, one per line, or under headings. For example:\nOverused words:\nleverage, synergy, passionate, thrilled"}
              />
            </Field>
            {settingsDirty && (
              <div className="flex justify-end">
                <Button variant="primary" onClick={handleSaveSettings} loading={savingSettings} loadingLabel="Saving…">
                  Save preferences
                </Button>
              </div>
            )}
          </div>
        </Section>

        <Section
          title="Writing samples"
          serif
          id="samples"
          action={
            !adding && (
              <Button size="sm" icon="ti-plus" onClick={() => setAdding(true)}>
                Add a sample
              </Button>
            )
          }
        >
          {adding && (
            <div className="mb-6 pb-6 border-b border-rule space-y-5 animate-[fade-in_200ms_var(--ease-out)]">
              <p className="text-ink-soft">Letters you wrote yourself work best. Emails, essays or posts help too.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                <Field id="sample-name" label="Name">
                  <Input id="sample-name" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Letter to Acme, 2025" />
                </Field>
                <Field id="sample-kind" label="Kind">
                  <Select
                    id="sample-kind"
                    value={kind}
                    options={[
                      { value: "cover_letter" as WritingSampleKind, label: "Cover letter" },
                      { value: "other" as WritingSampleKind, label: "Other writing" },
                    ]}
                    onChange={setKind}
                  />
                </Field>
              </div>
              <div role="tablist" aria-label="How to add it" className="flex gap-6 border-b border-rule">
                {(["paste", "pdf"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={`relative h-10 text-ui font-semibold transition-colors duration-100 ${tab === t ? "text-ink" : "text-ink-soft hover:text-ink"}`}
                  >
                    {t === "paste" ? "Paste text" : "Upload a PDF"}
                    {tab === t && <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-ink" aria-hidden="true" />}
                  </button>
                ))}
              </div>
              {tab === "pdf" && (
                <>
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
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-field border-[1.5px] border-dashed border-control p-5 text-center hover:bg-well transition-colors duration-100"
                  >
                    <i className="ti ti-upload text-2xl text-ink-soft block mb-2" aria-hidden="true" />
                    <span className="font-semibold text-ink">{parsing ? "Reading the text…" : pdfName || "Choose a PDF"}</span>
                  </button>
                </>
              )}
              {parseError && (
                <InlineMessage tone="caution" role="alert">
                  {parseError}
                </InlineMessage>
              )}
              {(tab === "paste" || content) && (
                <TextArea aria-label="Writing sample" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste something you wrote…" rows={8} />
              )}
              <div className="flex items-center justify-end gap-2">
                <Button variant="quiet" onClick={resetForm}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleAddSample} disabled={!label.trim() || !content.trim()} loading={savingSample} loadingLabel="Saving…">
                  Add sample
                </Button>
              </div>
            </div>
          )}

          {samples.length === 0 && !adding ? (
            <p className="text-ink-soft">No samples yet. Add two or three things you&apos;ve written to get started.</p>
          ) : (
            <ul>
              {samples.map((x) => (
                <li key={x.id} className={row}>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold truncate ${x.included ? "text-ink" : "text-ink-muted"}`}>{x.label}</p>
                    <p className="text-meta text-ink-soft truncate">
                      {x.kind === "cover_letter" ? "Cover letter" : "Other writing"} · {formatDate(x.createdAt)}
                    </p>
                  </div>
                  <IconButton icon="ti-trash" label={`Delete ${x.label}`} size="sm" onClick={() => setDeleteConfirm(x.id)} />
                  <Toggle checked={x.included} onChange={(v) => toggleSample(x, v)} label={`Include ${x.label}`} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Past cover letters" serif id="past-letters">
          <p className="-mt-2 mb-3 text-meta text-ink-soft">
            Off by default. Only include letters you&apos;ve edited into your own words, so drafts don&apos;t pull your voice off course.
          </p>
          {letters.length === 0 ? (
            <p className="text-ink-soft">No letters yet.</p>
          ) : (
            <ul>
              {letters.map((l) => (
                <li key={l.id} className={row}>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink truncate">{jobLabel(l.jobId)}</p>
                    <p className="text-meta text-ink-soft">
                      {formatDate(l.createdAt)} · <Origin edited={l.edited} />
                    </p>
                  </div>
                  <Toggle checked={l.useAsVoiceSample} onChange={(v) => toggleLetter(l, v)} label={`Use the ${jobLabel(l.jobId)} letter as a voice sample`} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Saved answers" serif id="past-answers">
          <p className="-mt-2 mb-3 text-meta text-ink-soft">Off by default. Turn on answers you wrote yourself.</p>
          {answers.length === 0 ? (
            <p className="text-ink-soft">No saved answers yet.</p>
          ) : (
            <ul>
              {answers.map((a) => (
                <li key={a.id} className={row}>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink truncate">{a.question}</p>
                    <p className="text-meta text-ink-soft truncate">
                      {a.tags.includes("cover-letter") && (
                        <>
                          <Origin edited={false} /> ·{" "}
                        </>
                      )}
                      {a.answer}
                    </p>
                  </div>
                  <Toggle checked={a.useAsVoiceSample} onChange={(v) => toggleAnswer(a, v)} label={`Use “${a.question}” as a voice sample`} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {confirming && (
        <Dialog
          title={`Delete “${confirming.label}”?`}
          description="Rebuild your profile afterwards so it stops drawing on it. This can't be undone."
          onRequestClose={() => setDeleteConfirm(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Keep it
              </Button>
              <Button variant="danger-solid" onClick={() => handleDeleteSample(confirming.id)}>
                Delete sample
              </Button>
            </>
          }
        />
      )}
    </PageFrame>
  );
}
