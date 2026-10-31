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
import Button from "@/components/ui/Button";
import Menu from "@/components/ui/Menu";
import Select from "@/components/ui/Select";
import { Field, TextArea } from "@/components/ui/Field";
import { Checkbox, InlineMessage, Section, Sheet, Skeleton } from "@/components/ui/bits";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

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
      <div aria-busy="true">
        <Skeleton className="h-80 rounded-sheet" />
      </div>
    );
  }

  const generator =
    resumes.length === 0 ? (
      <p className="text-ink-soft">
        Letters start from your resume.{" "}
        <Link href="/resumes" className="font-semibold text-action hover:underline underline-offset-4">
          Add a resume in Me
        </Link>{" "}
        and come back.
      </p>
    ) : (
      <div className="space-y-6">
        {resumes.length > 1 && (
          <Field id="letter-resume" label="Resume" className="sm:max-w-sm">
            <Select
              id="letter-resume"
              value={selectedResumeId}
              options={resumes.map((r) => ({ value: r.id, label: r.label }))}
              onChange={setSelectedResumeId}
            />
          </Field>
        )}
        <div>
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <p id="letter-stories" className="text-label font-semibold text-ink">
              Experience to draw from
            </p>
            <Link href="/background" className="text-meta font-semibold text-action hover:underline underline-offset-4">
              {backgrounds.length ? "Edit your experience" : "Add your experience"}
            </Link>
          </div>
          {backgrounds.length === 0 ? (
            <p className="text-meta text-ink-soft">Write up the stories behind your past jobs once, and every letter will draw from them.</p>
          ) : (
            <div role="group" aria-labelledby="letter-stories" className="flex flex-wrap gap-2">
              {backgrounds.map((b) => (
                <label
                  key={b.id}
                  className={`inline-flex items-center gap-2 cursor-pointer min-h-9 px-3 rounded-full border transition-colors duration-100 ${
                    b.included ? "border-action bg-action-wash text-ink" : "border-control text-ink-soft hover:bg-well"
                  }`}
                >
                  <Checkbox checked={b.included} onChange={(e) => handleToggleBackground(b.id, e.target.checked)} />
                  <span className="text-meta font-semibold">{backgroundHeading({ ...b, startDate: "", endDate: "" })}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <Field id="letter-notes" label="Notes for this letter" optional>
          <TextArea
            id="letter-notes"
            value={letterNotes}
            onChange={(e) => setLetterNotes(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="e.g. Mention I'm open to relocating. Focus on the Python work."
          />
        </Field>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant={letters.length ? "secondary" : "primary"}
            icon="ti-wand"
            onClick={handleGenerate}
            disabled={!selectedResumeId}
            loading={generating}
            loadingLabel="Writing…"
          >
            {letters.length ? "Write a new version" : "Draft my letter"}
          </Button>
          <Link href="/voice" className="ml-auto text-meta font-semibold text-action hover:underline underline-offset-4">
            Tune your voice
          </Link>
        </div>
        {generateError && (
          <InlineMessage tone="caution" role="alert">
            {generateError}
          </InlineMessage>
        )}
      </div>
    );
  const generatorIntro = "Drafted from your resume, your experience and your voice in Me.";

  return (
    <div>
      <Toast {...toastProps} />

      {/* The letter itself comes first once there is one, on paper. */}
      {viewingLetter ? (
        <>
          <section aria-labelledby="letter-heading">
            <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
              <div className="min-w-0">
                <h2 id="letter-heading" className="font-serif text-heading font-semibold text-ink">
                  Your letter
                </h2>
                <p className="mt-0.5 text-meta text-ink-muted">
                  {resumeLabel(viewingLetter.resumeId)} · {formatDate(viewingLetter.createdAt)}
                  {viewingLetter.edited ? " · edited by you" : " · first draft"}
                </p>
              </div>
              {!editing && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" icon="ti-pencil" onClick={() => edit.setValue({ letterId: viewingLetter.id, text: viewingLetter.content })}>
                    Edit
                  </Button>
                  <Button variant="quiet" size="sm" icon={copied ? "ti-check" : "ti-copy"} onClick={handleCopy}>
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Menu
                    label="More letter actions"

                    items={[
                      { label: savingToBank ? "Saving…" : "Save to Answers", icon: "ti-bookmarks", disabled: savingToBank, onSelect: handleSaveToBank },
                      { label: "Delete letter", icon: "ti-trash", danger: true, onSelect: () => handleDelete(viewingLetter.id) },
                    ]}
                  />
                </div>
              )}
            </div>
            <Sheet className="sm:px-12 sm:py-10">
              {editing ? (
                <div className="space-y-4">
                  {edit.restored && <p className="text-meta text-ink-soft">Picked up the edits you hadn&apos;t saved yet.</p>}
                  <TextArea
                    aria-label="Edit your letter"
                    value={draft}
                    onChange={(e) => edit.setValue({ letterId: viewingLetter.id, text: e.target.value })}
                    rows={16}
                    className="text-reading"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="quiet" onClick={edit.clear}>
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSaveEdit} disabled={!draft.trim()} loading={savingEdit} loadingLabel="Saving…">
                      Save changes
                    </Button>
                  </div>
                </div>
              ) : (
                <HighlightedLetter content={viewingLetter.content} claims={viewingLetter.claims} />
              )}
            </Sheet>
            <label className="mt-4 flex items-start gap-3 cursor-pointer">
              <Checkbox className="mt-0.5" checked={viewingLetter.useAsVoiceSample} onChange={(e) => handleToggleVoiceSample(e.target.checked)} />
              <span className="text-meta text-ink-soft">
                Use as a voice sample for future letters
                {!viewingLetter.edited && (
                  <span className="block mt-0.5 text-caution">
                    This is still the first draft. Edit it into your own words first so your voice doesn&apos;t drift.
                  </span>
                )}
              </span>
            </label>
          </section>

          {!editing && (
            <div className="mt-12">
              <LetterReview
                claims={viewingLetter.claims}
                checks={checks}
                checking={checkingSources}
                checkError={sourcesError}
                onCheckSources={handleCheckSources}
              />
            </div>
          )}

          <Section title="Write another version" serif id="letter-again" className="mt-12">
            <p className="-mt-2 mb-5 text-meta text-ink-soft">{generatorIntro}</p>
            {generator}
          </Section>
        </>
      ) : (
        <Sheet as="section" aria-labelledby="letter-form-heading">
          <h2 id="letter-form-heading" className="font-serif text-heading font-semibold text-ink">
            Write your letter
          </h2>
          <p className="mt-1 mb-6 text-meta text-ink-soft">{generatorIntro}</p>
          {generator}
        </Sheet>
      )}

      {letters.length > 1 && (
        <Section title="Earlier versions" serif id="letter-versions" className="mt-12">
          <ul>
            {letters.map((letter) => {
              const viewing = viewingLetter?.id === letter.id;
              return (
                <li key={letter.id} className="flex items-center justify-between gap-4 py-3 border-b border-rule last:border-b-0">
                  <p className="text-ink-soft truncate">
                    {resumeLabel(letter.resumeId)} · {formatDate(letter.createdAt)}
                    {letter.edited ? " · edited" : ""}
                  </p>
                  {viewing ? (
                    <span className="text-meta font-semibold text-ink">Showing above</span>
                  ) : (
                    <Button variant="quiet" size="sm" onClick={() => openLetter(letter)}>
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
