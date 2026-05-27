"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createJob } from "@/lib/jobs";
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

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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
      } else {
        setFetchError(SCRAPE_ERROR[data.reason] ?? "Failed to fetch. Try pasting the JD text.");
      }
    } catch {
      setFetchError("Something went wrong. Try pasting the JD text.");
    } finally {
      setFetching(false);
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
      const newJob: Job = {
        id: jobId,
        ...jobData,
        fitScore: null,
        fitReasoning: null,
        resumeIdUsed: null,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">Add job</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <i className="ti ti-x text-base" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* JD section */}
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs font-medium text-gray-500 mb-2">Job description</p>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-3 w-fit">
              {(["paste", "url"] as JdTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setJdTab(t)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                    jdTab === t
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t === "paste" ? "Paste JD" : "From URL"}
                </button>
              ))}
            </div>

            {jdTab === "paste" ? (
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the job description here…"
                rows={6}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                    placeholder="https://..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleFetch}
                    disabled={fetching || !urlInput.trim()}
                    className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {fetching ? (
                      <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
                    ) : (
                      <i className="ti ti-download text-sm" aria-hidden="true" />
                    )}
                    {fetching ? "Fetching…" : "Fetch"}
                  </button>
                </div>
                {fetchError && <p className="text-xs text-red-500">{fetchError}</p>}
                <p className="text-xs text-gray-400">
                  Some sites block scraping — if it fails, paste the JD text directly.
                </p>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="px-5 pt-3 pb-5">
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500 mb-3">Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Role title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Product Designer"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Company <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Acme Inc."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Remote, NYC"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Salary</label>
                  <input
                    type="text"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="e.g. $120k–$150k"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Stage</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as JobStage)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                  >
                    {ALL_STAGES.map((s) => (
                      <option key={s} value={s}>{STAGE_META[s].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as JobSource)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                  >
                    {ALL_SOURCES.map((s) => (
                      <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1.5">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any notes about this role…"
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          {saveError && <p className="text-xs text-red-500 mr-auto">{saveError}</p>}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </div>
  );
}
