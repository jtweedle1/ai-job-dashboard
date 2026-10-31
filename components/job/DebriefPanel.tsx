"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getJobs } from "@/lib/jobs";
import { createDebrief, getDebriefs, getDebriefsByJobId, deleteDebrief } from "@/lib/debriefs";
import Toast from "@/components/Toast";
import { useToast } from "@/lib/use-toast";
import { useDraft } from "@/lib/use-draft";
import type { Job } from "@/types/job";
import { DEBRIEF_FIELDS } from "@/types/debrief";
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

const EMPTY_FIELDS = {
  whatTheyAsked: "",
  wentWell: "",
  feltWeird: "",
  followUpOpportunities: "",
  answersToImprove: "",
};

// Interview notes. Inside a job it's the Interview notes step (log + this job's notes); without a job it's
// the read-only list under Me → Library.
export default function DebriefPanel({
  job,
  onDebriefsChange,
}: {
  job?: Job;
  onDebriefsChange?: (count: number) => void;
}) {
  const { user } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [debriefs, setDebriefs] = useState<Debrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [interviewDate, setInterviewDate] = useState(todayString());
  // Half-written notes survive switching steps or reloading, until they're saved.
  const { value: fields, setValue: setFields, clear: clearFields } = useDraft(
    `debrief:${job?.id ?? "library"}`,
    EMPTY_FIELDS,
    (v) => Object.values(v).every((x) => !x.trim())
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { show: showToast, toastProps } = useToast();

  useEffect(() => {
    if (!user) return;
    const load = job
      ? getDebriefsByJobId(user.uid, job.id).then((d) => [d, [job]] as const)
      : Promise.all([getDebriefs(user.uid), getJobs(user.uid)]);
    load.then(([d, j]) => {
      setDebriefs(d);
      setJobs([...j]);
      setLoading(false);
    });
  }, [user, job]);

  function updateDebriefs(next: Debrief[]) {
    setDebriefs(next);
    onDebriefsChange?.(next.length);
  }


  async function handleSave() {
    if (!user || !job || !interviewDate) return;
    setSaving(true);
    setSaveError("");
    try {
      const data = { jobId: job.id, interviewDate: parseLocalDate(interviewDate), ...fields };
      const id = await createDebrief(user.uid, data);
      const next = [{ id, ...data, createdAt: new Date() }, ...debriefs].sort(
        (a, b) => b.interviewDate.getTime() - a.interviewDate.getTime()
      );
      updateDebriefs(next);
      setExpandedId(id);
      clearFields();
      setInterviewDate(todayString());
      showToast("Saved to your interview notes");
    } catch {
      setSaveError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // Gone from the page at once; really deleted only once the Undo toast has gone.
  function handleDelete(id: string) {
    if (!user) return;
    const uid = user.uid;
    const before = debriefs;
    const wasExpanded = expandedId;
    updateDebriefs(debriefs.filter((d) => d.id !== id));
    if (expandedId === id) setExpandedId(null);
    const restore = () => {
      updateDebriefs(before);
      setExpandedId(wasExpanded);
    };
    showToast("Interview notes deleted", {
      undo: restore,
      commit: () =>
        void deleteDebrief(uid, id).catch(() => {
          restore();
          showToast("Couldn't delete those notes. Try again.", { tone: "error" });
        }),
    });
  }

  function jobFor(jobId: string) {
    return jobs.find((j) => j.id === jobId);
  }

  const fieldClass =
    "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800";

  if (loading) {
    return <div className="h-48 bg-white/60 dark:bg-gray-800 rounded-3xl animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <Toast {...toastProps} />

      {job && (
        <div className="surface">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="section-label">How did it go?</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Jot it down while it&apos;s fresh. Every debrief lands in Me → Library, so the next letter and the
              next interview can use it.
            </p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="sm:w-1/2">
              <label htmlFor="debrief-date" className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Interview date</label>
              <input
                id="debrief-date"
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className={fieldClass}
              />
            </div>
            {DEBRIEF_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label htmlFor={`debrief-${key}`} className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
                <textarea
                  id={`debrief-${key}`}
                  value={fields[key]}
                  onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  rows={3}
                  className={`${fieldClass} resize-none`}
                />
              </div>
            ))}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={!interviewDate || saving}
                className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-sm shadow-primary-600/20 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />}
                {saving ? "Saving…" : "Save notes"}
              </button>
              {saveError && <p role="alert" className="text-xs text-red-700 dark:text-red-300">{saveError}</p>}
            </div>
          </div>
        </div>
      )}

      {debriefs.length > 0 ? (
        <div className="surface">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="section-label">{job ? "Earlier debriefs" : "Every interview, in your words"}</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {debriefs.map((debrief) => {
              const dj = jobFor(debrief.jobId);
              const open = expandedId === debrief.id;
              return (
                <div key={debrief.id}>
                  <div className="flex items-center gap-2 pr-3">
                    <button
                      onClick={() => setExpandedId(open ? null : debrief.id)}
                      aria-expanded={open}
                      className="flex-1 min-w-0 px-5 py-3 flex items-center justify-between gap-4 hover:bg-white/60 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                          {job ? formatDate(debrief.interviewDate) : dj?.title ?? "Unknown job"}
                        </p>
                        {!job && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {dj?.company} · {formatDate(debrief.interviewDate)}
                          </p>
                        )}
                      </div>
                      <i
                        className={`ti ${open ? "ti-chevron-up" : "ti-chevron-down"} text-gray-500 dark:text-gray-400 text-sm`}
                        aria-hidden="true"
                      />
                    </button>
                    {!job && dj && (
                      <Link
                        href={`/applications/${dj.id}?step=debrief`}
                        className="text-xs text-primary-600 hover:underline shrink-0"
                      >
                        Open job
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(debrief.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50 shrink-0"
                      aria-label="Delete interview notes"
                    >
                      <i className="ti ti-trash text-xs" aria-hidden="true" />
                    </button>
                  </div>

                  {open && (
                    <div className="px-5 pb-4 space-y-3 pt-1">
                      {DEBRIEF_FIELDS.map(({ key, label }) =>
                        debrief[key] ? (
                          <div key={key}>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                              {debrief[key]}
                            </p>
                          </div>
                        ) : null
                      )}
                      {DEBRIEF_FIELDS.every(({ key }) => !debrief[key]) && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No notes recorded.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        !job && (
          <div className="surface p-10 text-center">
            <div className="w-12 h-12 rounded-full glow-gradient flex items-center justify-center mx-auto mb-3">
              <i className="ti ti-clipboard-list text-gray-700 dark:text-gray-100 text-xl" aria-hidden="true" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No interview notes yet. After an interview, open the job and use its Debrief step.
            </p>
          </div>
        )
      )}
    </div>
  );
}
