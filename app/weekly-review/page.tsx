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
  const parsedSummary = aiSummary ? parseAiSummary(aiSummary) : null;

  const thisWeekReview = reviews.find(
    (r) => r.weekOf.getTime() === thisWeekStart.getTime()
  );

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-7 bg-gray-100 dark:bg-gray-800 rounded w-40" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Toast {...toastProps} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Weekly review</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {reviews.length} review{reviews.length !== 1 ? "s" : ""} logged
          </p>
        </div>
        {!activeId && !composing && (
          <button
            onClick={
              thisWeekReview ? () => loadReview(thisWeekReview) : () => startNewReview()
            }
            className="flex items-center gap-2 bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-primary-700 transition-colors shrink-0"
          >
            <i className="ti ti-plus text-sm" aria-hidden="true" />
            {thisWeekReview ? "Continue this week" : "Start this week's review"}
          </button>
        )}
      </div>

      {/* Active form */}
      {(activeId !== null || composing) && (
        <div className="surface mb-4">
          <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="section-label">
                {activeId
                  ? `Week of ${formatWeek(activeReview!.weekOf)}`
                  : `Week of ${formatWeek(thisWeekStart)}`}
              </h2>
            </div>
            {activeId && (
              <button
                onClick={() => handleDelete(activeId)}
                className="text-gray-500 dark:text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                aria-label="Delete review"
              >
                <i className="ti ti-trash text-sm" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="px-4 py-4 space-y-4">
            {/* Numbers */}
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { key: "applicationsSent", label: "Applications sent" },
                  { key: "interviewsBooked", label: "Interviews booked" },
                  { key: "responsesReceived", label: "Responses received" },
                ] as { key: keyof Fields; label: string }[]
              ).map(({ key, label }) => (
                <div key={key}>
                  <label htmlFor={`wr-${key}`} className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
                  <input
                    id={`wr-${key}`}
                    type="number"
                    min={0}
                    value={fields[key] as number}
                    onChange={(e) =>
                      setField(key, Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800"
                  />
                </div>
              ))}
            </div>
            {prefilled && (
              <p className="-mt-2 text-xs text-gray-500 dark:text-gray-400">
                <i className="ti ti-sparkles text-xs mr-1" aria-hidden="true" />
                Applications and interviews are counted from your tracker. Change them if they&apos;re off.
              </p>
            )}

            {/* Text fields */}
            <div className="space-y-3">
              {(
                [
                  {
                    key: "bestResumeVersion",
                    label: "Best-performing resume version",
                    placeholder: "Which resume version got the most responses?",
                  },
                  {
                    key: "rolesToDeprioritize",
                    label: "Roles to deprioritize",
                    placeholder: "Any role types or companies you're moving away from?",
                  },
                  {
                    key: "nextWeekFocus",
                    label: "Next week focus",
                    placeholder: "What's the one thing you want to do differently next week?",
                  },
                ] as { key: keyof Fields; label: string; placeholder: string }[]
              ).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label htmlFor={`wr-${key}`} className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
                  <textarea
                    id={`wr-${key}`}
                    value={fields[key] as string}
                    onChange={(e) => setField(key, e.target.value)}
                    placeholder={placeholder}
                    rows={2}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none dark:bg-gray-800"
                  />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
                ) : null}
                {saving ? "Saving…" : activeId ? "Save changes" : "Save review"}
              </button>

              {activeId && (
                <button
                  onClick={handleGenerateSummary}
                  disabled={generatingSummary}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {generatingSummary ? (
                    <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
                  ) : (
                    <i className="ti ti-wand text-sm" aria-hidden="true" />
                  )}
                  {generatingSummary
                    ? "Generating…"
                    : aiSummary
                    ? "Regenerate summary"
                    : "Generate AI summary"}
                </button>
              )}

              {(activeId || composing) && (
                <button
                  onClick={closeForm}
                  className="text-sm text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Close
                </button>
              )}

              {summaryError && (
                <p role="alert" className="text-xs text-amber-800 dark:text-amber-300 w-full">{summaryError}</p>
              )}
            </div>
          </div>

          {/* AI summary */}
          {parsedSummary && (
            <div className="border-t border-gray-50 dark:border-gray-800 px-4 py-4 space-y-3">
              <h3 className="section-label">
                AI summary
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {parsedSummary.summary}
              </p>
              {parsedSummary.steps.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <h3 className="section-label">
                    Next steps
                  </h3>
                  {parsedSummary.steps.map((step, i) => (
                    <div key={i} className="flex gap-2">
                      <i
                        className="ti ti-arrow-right text-primary-500 text-sm shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-300">{step}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* No reviews + not editing */}
      {reviews.length === 0 && activeId === null && !composing && (
        <div className="surface p-10 text-center">
          <div className="w-10 h-10 rounded-full glow-gradient flex items-center justify-center mx-auto mb-3">
            <i className="ti ti-calendar-week text-gray-700 dark:text-gray-100 text-xl" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            No weekly reviews yet. Start your first one above.
          </p>
          <button
            onClick={() => startNewReview()}
            className="inline-flex items-center gap-2 bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-primary-700 transition-colors"
          >
            <i className="ti ti-plus text-sm" aria-hidden="true" />
            Start this week&apos;s review
          </button>
        </div>
      )}

      {/* Past reviews */}
      {reviews.filter((r) => r.id !== activeId).length > 0 && (
        <div className="surface">
          <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800">
            <h2 className="section-label">
              Past reviews
            </h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {reviews
              .filter((r) => r.id !== activeId)
              .map((review) => (
                <div key={review.id}>
                  <div className="flex items-center justify-between px-4 py-3 gap-4">
                    <button
                      onClick={() =>
                        setExpandedArchiveId(
                          expandedArchiveId === review.id ? null : review.id
                        )
                      }
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        Week of {formatWeek(review.weekOf)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {review.applicationsSent} sent · {review.interviewsBooked} interviews ·{" "}
                        {review.responsesReceived} responses
                        {review.aiSummary && (
                          <span className="ml-1.5 text-primary-600">· AI summary</span>
                        )}
                      </p>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => loadReview(review)}
                        className="text-xs font-medium text-gray-500 hover:text-primary-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(review.id)}
                        className="text-gray-200 dark:text-gray-700 hover:text-red-400 transition-colors disabled:opacity-50"
                        aria-label="Delete"
                      >
                        <i className="ti ti-trash text-xs" aria-hidden="true" />
                      </button>
                      <i
                        className={`ti ${
                          expandedArchiveId === review.id
                            ? "ti-chevron-up"
                            : "ti-chevron-down"
                        } text-gray-500 dark:text-gray-400 text-sm`}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {expandedArchiveId === review.id && (
                    <div className="px-4 pb-4 border-t border-gray-50 dark:border-gray-800 pt-3 space-y-3">
                      {[
                        { label: "Best resume version", value: review.bestResumeVersion },
                        { label: "Roles to deprioritize", value: review.rolesToDeprioritize },
                        { label: "Next week focus", value: review.nextWeekFocus },
                      ]
                        .filter((f) => f.value)
                        .map((f) => (
                          <div key={f.label}>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                              {f.label}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {f.value}
                            </p>
                          </div>
                        ))}
                      {review.aiSummary && (() => {
                        const parsed = parseAiSummary(review.aiSummary);
                        return (
                          <div className="pt-2 border-t border-gray-50 dark:border-gray-800 space-y-2">
                            <h3 className="section-label">
                              AI summary
                            </h3>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                              {parsed.summary}
                            </p>
                            {parsed.steps.map((step, i) => (
                              <div key={i} className="flex gap-2">
                                <i
                                  className="ti ti-arrow-right text-primary-500 text-sm shrink-0 mt-0.5"
                                  aria-hidden="true"
                                />
                                <p className="text-sm text-gray-600 dark:text-gray-300">{step}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
