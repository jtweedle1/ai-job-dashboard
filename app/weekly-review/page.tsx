"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { authedFetch, noKeyMessage } from "@/lib/api-client";
import { aiErrorMessage } from "@/lib/ai-errors";
import {
  createReview,
  getReviews,
  updateReview,
  deleteReview,
} from "@/lib/weeklyReviews";
import { getJobs } from "@/lib/jobs";
import { getDebriefs } from "@/lib/debriefs";
import { weekCounts } from "@/lib/today";
import type { Job } from "@/types/job";
import type { WeeklyReview } from "@/types/weeklyReview";
import Toast from "@/components/Toast";
import { useToast } from "@/lib/use-toast";
import { useDraft } from "@/lib/use-draft";
import PageFrame from "@/components/ui/PageFrame";
import Button, { IconButton } from "@/components/ui/Button";
import { Field, Input, TextArea } from "@/components/ui/Field";
import { EmptyState, InlineMessage, LoadingBlocks, Section, Sheet } from "@/components/ui/bits";
import { Notebook } from "@/components/illustrations";

// What a week added up to, with the zeros left out: "2 sent, 1 interview".
function weekLine(r: Pick<WeeklyReview, "applicationsSent" | "interviewsBooked" | "responsesReceived">): string {
  const parts = [
    r.applicationsSent && `${r.applicationsSent} sent`,
    r.interviewsBooked && `${r.interviewsBooked} interview${r.interviewsBooked !== 1 ? "s" : ""}`,
    r.responsesReceived && `${r.responsesReceived} response${r.responsesReceived !== 1 ? "s" : ""}`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "A quiet week";
}

function Summary({ text }: { text: string }) {
  const parsed = parseAiSummary(text);
  return (
    <div>
      <p className="text-reading text-ink">{parsed.summary}</p>
      {parsed.steps.length > 0 && (
        <>
          <h4 className="mt-5 text-label font-semibold text-ink-soft">Next steps</h4>
          <ul className="mt-2 space-y-2">
            {parsed.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-sun shrink-0" aria-hidden="true" />
                <p className="text-ink">{step}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function weekStartOf(d: Date): Date {
  const s = new Date(d);
  s.setDate(d.getDate() - d.getDay());
  s.setHours(0, 0, 0, 0);
  return s;
}

function formatWeek(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function parseAiSummary(text: string): { summary: string; steps: string[] } {
  const summaryMatch = text.match(/SUMMARY\s*([\s\S]*?)(?=NEXT STEPS|$)/i);
  const stepsMatch = text.match(/NEXT STEPS\s*([\s\S]*?)$/i);
  const summary = summaryMatch?.[1]?.trim() ?? text;
  const steps = stepsMatch?.[1]
    ?.split("\n")
    .map((l) => l.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean) ?? [];
  return { summary, steps };
}

const BLANK_FIELDS = {
  applicationsSent: 0,
  interviewsBooked: 0,
  responsesReceived: 0,
  bestResumeVersion: "",
  rolesToDeprioritize: "",
  nextWeekFocus: "",
};

type Fields = typeof BLANK_FIELDS;

export default function WeeklyReviewPage() {
  const { user } = useAuth();

  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeId, setActiveId] = useState<string | null>(null);
  const draft = useDraft<{ weekOf: number; fields: Fields } | null>("weekly-review-new", null, (v) => v == null);
  // Writing a new review for this week that isn't saved yet.
  const [composing, setComposing] = useState(false);
  // The numbers in the new review came from the tracker, not from memory.
  const [prefilled, setPrefilled] = useState(false);
  const [tracked, setTracked] = useState<{ jobs: Job[]; debriefs: { jobId: string; interviewDate: Date }[] }>({
    jobs: [],
    debriefs: [],
  });
  const [fields, setFields] = useState<Fields>(BLANK_FIELDS);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const [expandedArchiveId, setExpandedArchiveId] = useState<string | null>(null);
  const { show: showToast, toastProps } = useToast();

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getReviews(user.uid),
      // The tracker only pre-fills numbers, so a failed read just leaves them for you to type.
      getJobs(user.uid).catch(() => []),
      getDebriefs(user.uid).catch(() => []),
    ]).then(([r, jobs, debriefs]) => {
      setReviews(r);
      setTracked({ jobs, debriefs });
      if (r.length === 0) startNewReview({ jobs, debriefs });
      setLoading(false);
    });
    // startNewReview only reads what it's handed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  function setField<K extends keyof Fields>(key: K, value: Fields[K]) {
    const next = { ...fields, [key]: value };
    setFields(next);
    // A new review in progress is kept as a draft until it's saved.
    if (!activeId) draft.setValue({ weekOf: weekStartOf(new Date()).getTime(), fields: next });
    setDirty(true);
  }

  // A new review starts with what the tracker already knows; everything stays editable.
  function startNewReview(from = tracked) {
    const weekOf = weekStartOf(new Date());
    const kept = draft.value?.weekOf === weekOf.getTime() ? draft.value.fields : null;
    setActiveId(null);
    setComposing(true);
    setFields(kept ?? { ...BLANK_FIELDS, ...weekCounts(from, weekOf) });
    setPrefilled(!kept);
    setDirty(false);
    setSummaryError("");
  }

  function closeForm() {
    setActiveId(null);
    setComposing(false);
    setFields(BLANK_FIELDS);
    setPrefilled(false);
    setDirty(false);
    setSummaryError("");
  }

  function loadReview(review: WeeklyReview) {
    setActiveId(review.id);
    setComposing(false);
    setPrefilled(false);
    setFields({
      applicationsSent: review.applicationsSent,
      interviewsBooked: review.interviewsBooked,
      responsesReceived: review.responsesReceived,
      bestResumeVersion: review.bestResumeVersion,
      rolesToDeprioritize: review.rolesToDeprioritize,
      nextWeekFocus: review.nextWeekFocus,
    });
    setDirty(false);
    setSummaryError("");
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      if (activeId) {
        await updateReview(user.uid, activeId, fields);
        setReviews((prev) =>
          prev.map((r) =>
            r.id === activeId ? { ...r, ...fields, updatedAt: new Date() } : r
          )
        );
        showToast("Saved");
      } else {
        const weekOf = weekStartOf(new Date());
        const id = await createReview(user.uid, {
          weekOf,
          ...fields,
          aiSummary: null,
        });
        const newReview: WeeklyReview = {
          id,
          weekOf,
          ...fields,
          aiSummary: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setReviews((prev) => [newReview, ...prev]);
        setActiveId(id);
        setComposing(false);
        draft.clear();
        setPrefilled(false);
        showToast("Review saved");
      }
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateSummary() {
    if (!user || !activeId) return;
    setGeneratingSummary(true);
    setSummaryError("");
    try {
      if (dirty) await handleSave();
      const res = await authedFetch("/api/weekly-summary", {
        method: "POST",
        body: JSON.stringify({ reviewId: activeId }),
      });
      const data = await res.json();
      if (res.status === 401 || data.error === "no_key") {
        setSummaryError(noKeyMessage("generate summaries"));
        return;
      }
      if (data.error) {
        setSummaryError(aiErrorMessage(res.status, data.error, "Generation failed. Try again."));
        return;
      }
      setReviews((prev) =>
        prev.map((r) =>
          r.id === activeId ? { ...r, aiSummary: data.aiSummary } : r
        )
      );
      showToast("Summary generated");
    } catch {
      setSummaryError("Something went wrong. Try again.");
    } finally {
      setGeneratingSummary(false);
    }
  }

  // Gone from the page at once; really deleted only once the Undo toast has gone.
  function handleDelete(id: string) {
    if (!user) return;
    const uid = user.uid;
    const before = reviews;
    const review = reviews.find((r) => r.id === id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
    if (activeId === id) closeForm();
    const restore = () => {
      setReviews(before);
      if (review && activeId === id) loadReview(review);
    };
    showToast("Review deleted", {
      undo: restore,
      commit: () =>
        void deleteReview(uid, id).catch(() => {
          restore();
          showToast("Couldn't delete that review. Try again.", { tone: "error" });
        }),
    });
  }

  const thisWeekStart = weekStartOf(new Date());
  const activeReview = reviews.find((r) => r.id === activeId) ?? null;
  const aiSummary = activeReview?.aiSummary ?? null;

  const thisWeekReview = reviews.find(
    (r) => r.weekOf.getTime() === thisWeekStart.getTime()
  );

  if (loading) {
    return (
      <PageFrame title="Weekly review">
        <LoadingBlocks rows={2} label="Loading your reviews" />
      </PageFrame>
    );
  }

  const editing = activeId !== null || composing;
  const past = reviews.filter((r) => r.id !== activeId);
  const startButton = (
    <Button
      variant="primary"
      icon={thisWeekReview ? "ti-pencil" : "ti-plus"}
      onClick={thisWeekReview ? () => loadReview(thisWeekReview) : () => startNewReview()}
    >
      {thisWeekReview ? "Continue this week" : "Start this week's review"}
    </Button>
  );

  return (
    <PageFrame
      title="Weekly review"
      intro="Ten minutes on Friday: what happened, what worked, and the one thing to change next week."
      action={!editing && reviews.length > 0 ? startButton : undefined}
    >
      <Toast {...toastProps} />

      {editing && (
        <Sheet as="section" aria-labelledby="wr-heading">
          <div className="flex items-start justify-between gap-4">
            <h2 id="wr-heading" className="font-serif text-heading font-semibold text-ink">
              Week of {formatWeek(activeId ? activeReview!.weekOf : thisWeekStart)}
            </h2>
            {activeId && <IconButton icon="ti-trash" label="Delete review" onClick={() => handleDelete(activeId)} />}
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-5">
            {(
              [
                { key: "applicationsSent", label: "Applications sent" },
                { key: "interviewsBooked", label: "Interviews booked" },
                { key: "responsesReceived", label: "Replies received" },
              ] as { key: keyof Fields; label: string }[]
            ).map(({ key, label }) => (
              <Field key={key} id={`wr-${key}`} label={label}>
                <Input
                  id={`wr-${key}`}
                  type="number"
                  min={0}
                  value={fields[key] as number}
                  onChange={(e) => setField(key, Math.max(0, parseInt(e.target.value) || 0))}
                  className="font-serif text-heading tabular-nums"
                />
              </Field>
            ))}
          </div>
          {prefilled && (
            <p className="mt-3 text-meta text-ink-soft">Applications and interviews are counted from your jobs. Change them if they&apos;re off.</p>
          )}

          <div className="mt-8 space-y-6">
            {(
              [
                { key: "bestResumeVersion", label: "Which resume worked best?", placeholder: "Which version got the most replies?" },
                { key: "rolesToDeprioritize", label: "What to let go of", placeholder: "Any role types or companies you're moving away from?" },
                { key: "nextWeekFocus", label: "Next week's focus", placeholder: "What's the one thing you want to do differently?" },
              ] as { key: keyof Fields; label: string; placeholder: string }[]
            ).map(({ key, label, placeholder }) => (
              <Field key={key} id={`wr-${key}`} label={label} optional>
                <TextArea id={`wr-${key}`} value={fields[key] as string} onChange={(e) => setField(key, e.target.value)} placeholder={placeholder} rows={2} />
              </Field>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-2 flex-wrap">
            <Button variant="primary" onClick={handleSave} loading={saving} loadingLabel="Saving…">
              {activeId ? "Save changes" : "Save review"}
            </Button>
            {activeId && (
              <Button icon="ti-wand" onClick={handleGenerateSummary} loading={generatingSummary} loadingLabel="Reading your week…">
                {aiSummary ? "Summarize again" : "Summarize my week"}
              </Button>
            )}
            <Button variant="quiet" onClick={closeForm}>
              Close
            </Button>
          </div>
          {summaryError && (
            <InlineMessage tone="caution" role="alert" className="mt-4">
              {summaryError}
            </InlineMessage>
          )}

          {aiSummary && (
            <div className="mt-8 pt-6 border-t border-rule">
              <h3 className="mb-2 text-label font-semibold text-ink-soft">Your week, summed up</h3>
              <Summary text={aiSummary} />
            </div>
          )}
        </Sheet>
      )}

      {reviews.length === 0 && !editing && (
        <EmptyState art={<Notebook />} title="Your first review" action={startButton}>
          Look back at the week while it&apos;s fresh. Wayfinder fills in the numbers for you.
        </EmptyState>
      )}

      {past.length > 0 && (
        <Section title="Past reviews" serif id="past" className={editing ? "mt-12" : undefined}>
          <ul>
            {past.map((review) => {
              const open = expandedArchiveId === review.id;
              return (
                <li key={review.id} className="py-3 border-b border-rule last:border-b-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedArchiveId(open ? null : review.id)}
                      aria-expanded={open}
                      className="flex-1 min-w-0 text-left py-1 px-3 -mx-3 rounded-field hover:bg-well transition-colors duration-100"
                    >
                      <span className="block font-semibold text-ink">Week of {formatWeek(review.weekOf)}</span>
                      <span className="block text-meta text-ink-soft">{weekLine(review)}</span>
                    </button>
                    <Button variant="quiet" size="sm" onClick={() => loadReview(review)}>
                      Edit
                    </Button>
                    <IconButton icon="ti-trash" label={`Delete the week of ${formatWeek(review.weekOf)}`} size="sm" onClick={() => handleDelete(review.id)} />
                  </div>

                  {open && (
                    <div className="mt-3 mb-2 space-y-4 animate-[fade-in_200ms_var(--ease-out)]">
                      {[
                        { label: "Which resume worked best", value: review.bestResumeVersion },
                        { label: "What to let go of", value: review.rolesToDeprioritize },
                        { label: "Next week's focus", value: review.nextWeekFocus },
                      ]
                        .filter((f) => f.value)
                        .map((f) => (
                          <div key={f.label}>
                            <p className="text-label font-semibold text-ink-soft">{f.label}</p>
                            <p className="mt-0.5 text-ink whitespace-pre-wrap">{f.value}</p>
                          </div>
                        ))}
                      {review.aiSummary && (
                        <div className="pt-3 border-t border-rule">
                          <p className="mb-2 text-label font-semibold text-ink-soft">Summed up</p>
                          <Summary text={review.aiSummary} />
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </PageFrame>
  );
}
