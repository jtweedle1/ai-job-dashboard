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
import Button, { IconButton } from "@/components/ui/Button";
import { Field, Input, TextArea } from "@/components/ui/Field";
import { EmptyState, InlineMessage, Section, Sheet, Skeleton } from "@/components/ui/bits";

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

  if (loading) {
    return <Skeleton className="h-56 rounded-sheet" />;
  }

  const list = debriefs.length > 0 && (
    <ul>
      {debriefs.map((debrief) => {
        const dj = jobFor(debrief.jobId);
        const open = expandedId === debrief.id;
        return (
          <li key={debrief.id} className="border-b border-rule last:border-b-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpandedId(open ? null : debrief.id)}
                aria-expanded={open}
                className="flex-1 min-w-0 py-3 px-3 -mx-3 rounded-field flex items-center justify-between gap-4 hover:bg-well transition-colors duration-100 text-left"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-ink truncate">{job ? formatDate(debrief.interviewDate) : dj?.title ?? "Unknown job"}</span>
                  {!job && (
                    <span className="block text-meta text-ink-soft">
                      {dj?.company} · {formatDate(debrief.interviewDate)}
                    </span>
                  )}
                </span>
                <i className={`ti ti-chevron-down text-ink-soft transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {!job && dj && (
                <Link href={`/applications/${dj.id}?step=debrief`} className="text-meta font-semibold text-action hover:underline underline-offset-4 shrink-0">
                  Open job
                </Link>
              )}
              <IconButton icon="ti-trash" label="Delete interview notes" size="sm" onClick={() => handleDelete(debrief.id)} />
            </div>

            {open && (
              <div className="pb-5 pt-1 space-y-4 animate-[fade-in_200ms_var(--ease-out)]">
                {DEBRIEF_FIELDS.map(({ key, label }) =>
                  debrief[key] ? (
                    <div key={key}>
                      <p className="text-label font-semibold text-ink-soft mb-1">{label}</p>
                      <p className="text-ink whitespace-pre-wrap">{debrief[key]}</p>
                    </div>
                  ) : null
                )}
                {DEBRIEF_FIELDS.every(({ key }) => !debrief[key]) && <p className="text-ink-muted">No notes recorded.</p>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div>
      <Toast {...toastProps} />

      {job && (
        <Sheet as="section" aria-labelledby="debrief-heading">
          <h2 id="debrief-heading" className="font-serif text-heading font-semibold text-ink">
            How did it go?
          </h2>
          <p className="mt-1 text-meta text-ink-soft">
            Jot it down while it&apos;s fresh. Every debrief lands in Me, under Library, so the next letter and the next
            interview can use it.
          </p>
          <div className="mt-6 space-y-5">
            <Field id="debrief-date" label="Interview date" className="sm:max-w-[13rem]">
              <Input id="debrief-date" type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} />
            </Field>
            {DEBRIEF_FIELDS.map(({ key, label, placeholder }) => (
              <Field key={key} id={`debrief-${key}`} label={label}>
                <TextArea
                  id={`debrief-${key}`}
                  value={fields[key]}
                  onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  rows={3}
                />
              </Field>
            ))}
            <Button variant="primary" onClick={handleSave} disabled={!interviewDate} loading={saving} loadingLabel="Saving…">
              Save notes
            </Button>
            {saveError && (
              <InlineMessage tone="danger" role="alert">
                {saveError}
              </InlineMessage>
            )}
          </div>
        </Sheet>
      )}

      {list ? (
        job ? (
          <Section title="Earlier debriefs" serif id="debriefs" className="mt-12">
            {list}
          </Section>
        ) : (
          <Section title="Every interview, in your words" id="debriefs">
            {list}
          </Section>
        )
      ) : (
        !job && <EmptyState title="No interview notes yet">After an interview, open the job and use its Interview notes step.</EmptyState>
      )}
    </div>
  );
}
