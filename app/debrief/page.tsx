"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getJobs } from "@/lib/jobs";
import { createDebrief, getDebriefs, deleteDebrief } from "@/lib/debriefs";
import type { Job } from "@/types/job";
import type { Debrief } from "@/types/debrief";

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const DEBRIEF_FIELDS: { key: keyof Omit<Debrief, "id" | "jobId" | "interviewDate" | "createdAt">; label: string; placeholder: string }[] = [
  { key: "whatTheyAsked",         label: "What they asked",          placeholder: "Questions and topics that came up…" },
  { key: "wentWell",              label: "Went well",                placeholder: "Moments you felt confident or connected…" },
  { key: "feltWeird",             label: "Felt weird",               placeholder: "Anything that felt off or you stumbled on…" },
  { key: "followUpOpportunities", label: "Follow-up opportunities",  placeholder: "Things to follow up on with the company…" },
  { key: "answersToImprove",      label: "Answers to improve",       placeholder: "Responses you'd give differently next time…" },
];

function DebriefContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [debriefs, setDebriefs] = useState<Debrief[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedJobId, setSelectedJobId] = useState("");
  const [interviewDate, setInterviewDate] = useState(todayString());
  const [fields, setFields] = useState({
    whatTheyAsked: "",
    wentWell: "",
    feltWeird: "",
    followUpOpportunities: "",
    answersToImprove: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([getJobs(user.uid), getDebriefs(user.uid)]).then(([j, d]) => {
      setJobs(j);
      setDebriefs(d);
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

  function resetForm() {
    setFields({ whatTheyAsked: "", wentWell: "", feltWeird: "", followUpOpportunities: "", answersToImprove: "" });
    setInterviewDate(todayString());
    setSaveError("");
  }

  async function handleSave() {
    if (!user || !selectedJobId || !interviewDate) return;
    setSaving(true);
    setSaveError("");
    try {
      const data = {
        jobId: selectedJobId,
        interviewDate: parseLocalDate(interviewDate),
        ...fields,
      };
      const id = await createDebrief(user.uid, data);
      const newDebrief: Debrief = {
        id,
        ...data,
        createdAt: new Date(),
      };
      setDebriefs((prev) => [newDebrief, ...prev].sort(
        (a, b) => b.interviewDate.getTime() - a.interviewDate.getTime()
      ));
      setExpandedId(id);
      resetForm();
      showToast("Debrief saved");
    } catch {
      setSaveError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    setDeletingId(id);
    await deleteDebrief(user.uid, id);
    setDebriefs((prev) => prev.filter((d) => d.id !== id));
    if (expandedId === id) setExpandedId(null);
    setDeletingId(null);
    showToast("Deleted");
  }

  function jobTitle(jobId: string) {
    return jobs.find((j) => j.id === jobId)?.title ?? "Unknown job";
  }

  function jobCompany(jobId: string) {
    return jobs.find((j) => j.id === jobId)?.company ?? "";
  }

  const canSave = !!selectedJobId && !!interviewDate;

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-7 bg-gray-100 rounded w-36" />
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
        <h1 className="text-lg font-semibold text-gray-900">Debrief</h1>
        <p className="text-sm text-gray-500">
          {debriefs.length} session{debriefs.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Add debrief form */}
      <div className="bg-white border border-gray-100 rounded-xl mb-4">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Log debrief</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          {jobs.length === 0 ? (
            <p className="text-sm text-gray-400">
              No jobs yet.{" "}
              <button onClick={() => router.push("/applications")} className="text-emerald-600 hover:underline">
                Add a job
              </button>{" "}
              first.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Job</label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>{j.title} — {j.company}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Interview date</label>
                  <input
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="border-t border-gray-50 pt-3 space-y-3">
                {DEBRIEF_FIELDS.map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
                    <textarea
                      value={fields[key]}
                      onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={!canSave || saving}
                  className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
                  ) : null}
                  {saving ? "Saving…" : "Save debrief"}
                </button>
                {saveError && <p className="text-xs text-red-500">{saveError}</p>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Past debriefs */}
      {debriefs.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Past sessions</p>
          </div>
          <div className="divide-y divide-gray-50">
            {debriefs.map((debrief) => (
              <div key={debrief.id}>
                <button
                  onClick={() => setExpandedId(expandedId === debrief.id ? null : debrief.id)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{jobTitle(debrief.jobId)}</p>
                    <p className="text-xs text-gray-400">{jobCompany(debrief.jobId)} · {formatDate(debrief.interviewDate)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(debrief.id); }}
                      disabled={deletingId === debrief.id}
                      className="text-gray-200 hover:text-red-400 transition-colors disabled:opacity-50"
                      aria-label="Delete"
                    >
                      <i className="ti ti-trash text-xs" aria-hidden="true" />
                    </button>
                    <i
                      className={`ti ${expandedId === debrief.id ? "ti-chevron-up" : "ti-chevron-down"} text-gray-300 text-sm`}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {expandedId === debrief.id && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                    {DEBRIEF_FIELDS.map(({ key, label }) =>
                      debrief[key] ? (
                        <div key={key}>
                          <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{debrief[key]}</p>
                        </div>
                      ) : null
                    )}
                    {DEBRIEF_FIELDS.every(({ key }) => !debrief[key]) && (
                      <p className="text-sm text-gray-400 italic">No notes recorded.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {debriefs.length === 0 && jobs.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <i className="ti ti-clipboard-list text-gray-400 text-xl" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500">No debriefs yet. Log your first interview above.</p>
        </div>
      )}
    </div>
  );
}

export default function DebriefPage() {
  return (
    <Suspense>
      <DebriefContent />
    </Suspense>
  );
}
