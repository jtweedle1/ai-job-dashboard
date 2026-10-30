"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { authedFetch, noKeyMessage } from "@/lib/api-client";
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

export default function AddJobModal({ onClose, onSaved }: Props) {
  const { user } = useAuth();

  const [jdTab, setJdTab] = useState<JdTab>("paste");
  const [jdText, setJdText] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [source, setSource] = useState<JobSource>("linkedin");
  const [stage, setStage] = useState<JobStage>("saved");
  const [notes, setNotes] = useState("");

  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);

  // A native modal dialog: the page behind goes inert, Tab stays inside, and focus returns to
  // whatever opened it when it goes away.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => opener?.focus();
  }, []);

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
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      onSaved(newJob);
    } catch {
      setSaveError("Failed to save. Try again.");
      setSaving(false);
    }
  }

  const canSave = title.trim().length > 0 && company.trim().length > 0;

  const inputClass =
    "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800";
  const labelClass = "block text-xs text-gray-500 dark:text-gray-400 mb-1.5";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="add-job-title"
      onCancel={(e) => {
        // Escape: ask first if there's anything to lose.
        e.preventDefault();
        requestClose();
      }}
      onClick={(e) => {
        // A click on the dimmed backdrop lands on the dialog element itself.
        if (e.target === dialogRef.current) requestClose();
      }}
      className="m-auto p-0 w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] bg-transparent backdrop:bg-black/40 overflow-visible"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h2 id="add-job-title" className="text-sm font-semibold text-gray-900 dark:text-gray-50">Add job</h2>
          <button
            type="button"
            onClick={requestClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <i className="ti ti-x text-base" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* JD section */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
              <label htmlFor={jdTab === "paste" ? "job-jd" : "job-fetch-url"} className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {jdTab === "paste" ? "Job description" : "Link to the posting"}
              </label>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1 w-fit" role="group" aria-label="How to add the description">
                {(["paste", "url"] as JdTab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setJdTab(t)}
                    aria-pressed={jdTab === t}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                      jdTab === t
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    {t === "paste" ? "Paste it" : "From a link"}
                  </button>
                ))}
              </div>
            </div>

            {jdTab === "paste" ? (
              <textarea
                id="job-jd"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the job description here…"
                rows={6}
                className={`${inputClass} resize-none`}
              />
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    id="job-fetch-url"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                    placeholder="https://..."
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={handleFetch}
                    disabled={fetching || extracting || !urlInput.trim()}
                    className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {fetching || extracting ? (
                      <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
                    ) : (
                      <i className="ti ti-download text-sm" aria-hidden="true" />
                    )}
                    {fetching ? "Fetching…" : extracting ? "Filling in…" : "Fetch and fill in"}
                  </button>
                </div>
                {fetchError && <p role="alert" className="text-xs text-red-700 dark:text-red-300">{fetchError}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Fetches the page, then uses AI to fill in any empty fields below. Some sites block this; if so, paste the
                  description instead.
                </p>
              </div>
            )}
          </div>

          {/* AI extraction for pasted text */}
          {jdTab === "paste" && jdText.trim().length > 50 && (
            <div className="px-5 pb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleExtract()}
                  disabled={extracting}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950 hover:bg-primary-100 dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-800 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {extracting ? (
                    <i className="ti ti-loader-2 animate-spin text-xs" aria-hidden="true" />
                  ) : (
                    <i className="ti ti-wand text-xs" aria-hidden="true" />
                  )}
                  {extracting ? "Filling in…" : "Fill in the details with AI"}
                </button>
              </div>
            </div>
          )}
          {extractError && (
            <p role="alert" className="px-5 pb-3 text-xs text-amber-800 dark:text-amber-300">{extractError}</p>
          )}

          {/* Details */}
          <div className="px-5 pt-3 pb-5">
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="job-title" className={labelClass}>
                    Role title <span className="text-red-700 dark:text-red-300" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="job-title"
                    type="text"
                    aria-required="true"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Product Designer"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="job-company" className={labelClass}>
                    Company <span className="text-red-700 dark:text-red-300" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="job-company"
                    type="text"
                    aria-required="true"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Acme Inc."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="job-location" className={labelClass}>Location</label>
                  <input
                    id="job-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Remote, NYC"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="job-salary" className={labelClass}>Salary</label>
                  <input
                    id="job-salary"
                    type="text"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="e.g. $120k–$150k"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="job-stage" className={labelClass}>Stage</label>
                  <select
                    id="job-stage"
                    value={stage}
                    onChange={(e) => setStage(e.target.value as JobStage)}
                    className={inputClass}
                  >
                    {ALL_STAGES.map((s) => (
                      <option key={s} value={s}>{STAGE_META[s].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="job-source" className={labelClass}>Source</label>
                  <select
                    id="job-source"
                    value={source}
                    onChange={(e) => setSource(e.target.value as JobSource)}
                    className={inputClass}
                  >
                    {ALL_SOURCES.map((s) => (
                      <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="job-url" className={labelClass}>Job URL</label>
                  <input
                    id="job-url"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="job-notes" className={labelClass}>Notes</label>
                  <textarea
                    id="job-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any notes about this role…"
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {confirmDiscard ? (
          <div role="alert" className="flex items-center gap-2 flex-wrap px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0 bg-amber-50 dark:bg-amber-950/40 rounded-b-2xl">
            <p className="text-sm text-gray-800 dark:text-gray-100 mr-auto">Discard this job? What you&apos;ve entered will be lost.</p>
            <button
              type="button"
              autoFocus
              onClick={() => setConfirmDiscard(false)}
              className="text-sm font-medium bg-primary-600 text-white px-4 py-2 rounded-full hover:bg-primary-700 transition-colors"
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-red-700 dark:text-red-300 hover:text-red-800 px-4 py-2 rounded-full transition-colors"
            >
              Discard
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
            {saveError && <p role="alert" className="text-xs text-red-700 dark:text-red-300 mr-auto">{saveError}</p>}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={requestClose}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-2 rounded-full transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || saving}
                className="flex items-center gap-2 bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  "Save job"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
