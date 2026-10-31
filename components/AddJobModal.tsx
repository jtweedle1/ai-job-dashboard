"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { authedFetch, noKeyMessage } from "@/lib/api-client";
import { useDraft } from "@/lib/use-draft";
import { aiErrorMessage } from "@/lib/ai-errors";
import { createJob } from "@/lib/jobs";
import { getCompanyByName, createCompany } from "@/lib/companies";
import {
  STAGE_META,
  SOURCE_LABELS,
  ALL_STAGES,
  ALL_SOURCES,
  type Job,
  type JobStage,
  type JobSource,
} from "@/types/job";
import Dialog from "./ui/Dialog";
import Button from "./ui/Button";
import Select from "./ui/Select";
import { Field, Input, TextArea, Label, HelpText } from "./ui/Field";
import { InlineMessage } from "./ui/bits";

interface Props {
  onClose: () => void;
  onSaved: (job: Job) => void;
}

type JdTab = "paste" | "url";

const SCRAPE_ERROR: Record<string, string> = {
  blocked: "That page blocked our request. Paste the JD text instead.",
  js_rendered: "That page requires JavaScript to load. Paste the JD text instead.",
  timeout: "The request timed out. Try again or paste the JD text.",
  fetch_failed: "Couldn't reach that URL. Check the link or paste the JD text.",
};

const BLANK_FORM = {
  jdText: "",
  urlInput: "",
  title: "",
  company: "",
  location: "",
  salary: "",
  source: "linkedin" as JobSource,
  stage: "saved" as JobStage,
  notes: "",
};

export default function AddJobModal({ onClose, onSaved }: Props) {
  const { user } = useAuth();

  const [jdTab, setJdTab] = useState<JdTab>("paste");
  // Everything typed or pasted is kept as a draft until the job is saved or discarded.
  const form = useDraft("add-job", BLANK_FORM, (f) =>
    [f.jdText, f.urlInput, f.title, f.company, f.location, f.salary, f.notes].every((v) => !v.trim())
  );
  const { jdText, urlInput, title, company, location, salary, source, stage, notes } = form.value;
  const set = (patch: Partial<typeof BLANK_FORM>) => form.setValue((f) => ({ ...f, ...patch }));
  const setJdText = (jdText: string) => set({ jdText });
  const setUrlInput = (urlInput: string) => set({ urlInput });
  const setTitle = (title: string) => set({ title });
  const setCompany = (company: string) => set({ company });
  const setLocation = (location: string) => set({ location });
  const setSalary = (salary: string) => set({ salary });
  const setSource = (source: JobSource) => set({ source });
  const setStage = (stage: JobStage) => set({ stage });
  const setNotes = (notes: string) => set({ notes });

  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty = [jdText, urlInput, title, company, location, salary, notes].some((v) => v.trim() !== "");

  // Closing never throws away typed or pasted work without asking first.
  function requestClose() {
    if (dirty && !saving) setConfirmDiscard(true);
    else onClose();
  }

  async function handleFetch() {
    if (!urlInput.trim()) return;
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setJdText(data.text);
        setJdTab("paste");
        await handleExtract(data.text);
      } else {
        setFetchError(SCRAPE_ERROR[data.reason] ?? "Failed to fetch. Try pasting the JD text.");
      }
    } catch {
      setFetchError("Something went wrong. Try pasting the JD text.");
    } finally {
      setFetching(false);
    }
  }

  // Fills in only the fields that are still empty, so nothing you typed is overwritten.
  async function handleExtract(text = jdText) {
    if (!user || !text.trim()) return;
    setExtracting(true);
    setExtractError("");
    try {
      const res = await authedFetch("/api/extract-job", {
        method: "POST",
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (res.status === 401 || data.error === "no_key") {
        setExtractError(noKeyMessage("use AI extraction"));
        return;
      }
      if (data.error) {
        setExtractError(aiErrorMessage(res.status, data.error, "Extraction failed. Fill in the fields manually."));
        return;
      }
      if (data.title && !title) setTitle(data.title);
      if (data.company && !company) setCompany(data.company);
      if (data.location && !location) setLocation(data.location);
      if (data.salary && !salary) setSalary(data.salary);
      if (data.description) setJdText(data.description);
    } catch {
      setExtractError("Something went wrong. Fill in the fields manually.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    if (!user || !title.trim() || !company.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      const jobData = {
        title: title.trim(),
        company: company.trim(),
        location: location.trim() || null,
        salary: salary.trim() || null,
        url: urlInput.trim() || null,
        description: jdText.trim(),
        source,
        stage,
        notes: notes.trim() || null,
        appliedAt: stage === "applied" ? new Date() : null,
      };
      const jobId = await createJob(user.uid, jobData);

      const existing = await getCompanyByName(user.uid, company.trim());
      if (!existing) {
        await createCompany(user.uid, { name: company.trim(), jobId });
      }

      const newJob: Job = {
        id: jobId,
        ...jobData,
        fitScore: null,
        fitReasoning: null,
        resumeIdUsed: null,
        nextInterviewAt: null,
        lastFollowUpAt: null,
        snoozedUntil: null,
        followUps: 0,
        followUpsOff: false,
        applyBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      form.clear();
      onSaved(newJob);
    } catch {
      setSaveError("Failed to save. Try again.");
      setSaving(false);
    }
  }

  const canSave = title.trim().length > 0 && company.trim().length > 0;

  const busy = fetching || extracting;
  const hasDescription = jdText.trim().length > 50;

  return (
    <Dialog
      title="Add a job"
      description="Paste the description or a link, and the details fill themselves in. You can always edit them."
      onRequestClose={requestClose}
      footer={
        confirmDiscard ? (
          <div role="alert" className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <p className="sm:mr-auto text-ink">Discard this job? What you&apos;ve entered will be lost.</p>
            <Button
              variant="danger"
              onClick={() => {
                form.clear();
                onClose();
              }}
            >
              Discard
            </Button>
            <Button variant="primary" autoFocus onClick={() => setConfirmDiscard(false)}>
              Keep editing
            </Button>
          </div>
        ) : (
          <>
            {saveError && (
              <p role="alert" className="sm:mr-auto text-meta text-danger">
                {saveError}
              </p>
            )}
            <Button variant="secondary" onClick={requestClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!canSave} loading={saving} loadingLabel="Saving…">
              Save job
            </Button>
          </>
        )
      }
    >
      <div className="space-y-6">
        {form.restored && (
          <InlineMessage
            tone="info"
            action={
              <Button variant="quiet" size="sm" onClick={form.clear}>
                Start over
              </Button>
            }
          >
            Picked up where you left off.
          </InlineMessage>
        )}

        {/* Step one: the description, pasted or fetched. */}
        <div>
          <div className="flex items-end justify-between gap-3 mb-2 flex-wrap">
            <Label htmlFor={jdTab === "paste" ? "job-jd" : "job-fetch-url"} className="mb-0">
              {jdTab === "paste" ? "Job description" : "Link to the posting"}
            </Label>
            <div className="flex gap-4" role="group" aria-label="How to add the description">
              {(["paste", "url"] as JdTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setJdTab(t)}
                  aria-pressed={jdTab === t}
                  className={`relative h-8 text-sm font-semibold transition-colors duration-100 ${
                    jdTab === t ? "text-ink" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {t === "paste" ? "Paste it" : "From a link"}
                  {jdTab === t && <span className="absolute left-0 right-0 bottom-0.5 h-0.5 rounded-full bg-ink" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>

          {jdTab === "paste" ? (
            <>
              <TextArea
                id="job-jd"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the job description here…"
                rows={6}
              />
              {hasDescription && (
                <div className="mt-3">
                  <Button variant="secondary" size="sm" icon="ti-wand" onClick={() => handleExtract()} loading={extracting} loadingLabel="Filling in…">
                    Fill in the details
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  id="job-fetch-url"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                  placeholder="https://…"
                  aria-describedby="job-fetch-help"
                />
                <Button
                  variant="primary"
                  className="h-11"
                  onClick={handleFetch}
                  disabled={!urlInput.trim()}
                  loading={busy}
                  loadingLabel={fetching ? "Fetching…" : "Filling in…"}
                >
                  Fetch
                </Button>
              </div>
              {fetchError ? (
                <HelpText id="job-fetch-help" error>
                  <span role="alert">{fetchError}</span>
                </HelpText>
              ) : (
                <HelpText id="job-fetch-help">
                  Reads the page and fills in any empty details below. Some sites block this; if so, paste the description instead.
                </HelpText>
              )}
            </>
          )}
          {extractError && (
            <InlineMessage tone="caution" role="alert" className="mt-3">
              {extractError}
            </InlineMessage>
          )}
        </div>

        {/* Step two: the details, which the step above fills in where it can. */}
        <fieldset className="pt-6 border-t border-rule">
          <legend className="sr-only">Details</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
            <Field id="job-title" label="Role">
              <Input
                id="job-title"
                type="text"
                aria-required="true"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Product Designer"
              />
            </Field>
            <Field id="job-company" label="Company">
              <Input
                id="job-company"
                type="text"
                aria-required="true"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Inc."
              />
            </Field>
            <Field id="job-location" label="Location" optional>
              <Input
                id="job-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote, NYC"
              />
            </Field>
            <Field id="job-salary" label="Salary" optional>
              <Input
                id="job-salary"
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. $120k–$150k"
              />
            </Field>
            <Field id="job-stage" label="Stage">
              <Select
                id="job-stage"
                value={stage}
                onChange={setStage}
                options={ALL_STAGES.map((s) => ({ value: s, label: STAGE_META[s].label }))}
              />
            </Field>
            <Field id="job-source" label="Where you found it">
              <Select
                id="job-source"
                value={source}
                onChange={setSource}
                options={ALL_SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] }))}
              />
            </Field>
            <Field id="job-url" label="Link" optional className="sm:col-span-2">
              <Input id="job-url" type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://…" />
            </Field>
            <Field id="job-notes" label="Notes" optional className="sm:col-span-2">
              <TextArea id="job-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to remember about this role" rows={3} />
            </Field>
          </div>
          {!canSave && (title.trim() || company.trim()) && (
            <p className="mt-4 text-meta text-ink-muted">Add the role and company to save.</p>
          )}
        </fieldset>
      </div>
    </Dialog>
  );
}
