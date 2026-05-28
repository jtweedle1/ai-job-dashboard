"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { authedFetch } from "@/lib/api-client";
import {
  createReview,
  getReviews,
  updateReview,
  deleteReview,
} from "@/lib/weeklyReviews";
import type { WeeklyReview } from "@/types/weeklyReview";

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
  const [fields, setFields] = useState<Fields>(BLANK_FIELDS);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const [expandedArchiveId, setExpandedArchiveId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!user) return;
    getReviews(user.uid).then((r) => {
      setReviews(r);
      setLoading(false);
    });
  }, [user]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function setField<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function startNewReview() {
    setActiveId(null);
    setFields(BLANK_FIELDS);
    setDirty(false);
    setSummaryError("");
  }

  function loadReview(review: WeeklyReview) {
    setActiveId(review.id);
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
        setSummaryError("Add your Anthropic API key in Settings to generate summaries.");
        return;
      }
      if (data.error) {
        setSummaryError("Generation failed. Try again.");
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

  async function handleDelete(id: string) {
    if (!user) return;
    setDeletingId(id);
    await deleteReview(user.uid, id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
    if (activeId === id) startNewReview();
    setDeletingId(null);
    showToast("Deleted");
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
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />
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
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Weekly review</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {reviews.length} review{reviews.length !== 1 ? "s" : ""} logged
          </p>
        </div>
        {!activeId && (
          <button
            onClick={
              thisWeekReview ? () => loadReview(thisWeekReview) : startNewReview
            }
            className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shrink-0"
          >
            <i className="ti ti-plus text-sm" aria-hidden="true" />
            {thisWeekReview ? "Continue this week" : "Start this week's review"}
          </button>
        )}
      </div>

      {/* Active form */}
      {(activeId !== null || reviews.length === 0) && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl mb-4">
          <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {activeId
                  ? `Week of ${formatWeek(activeReview!.weekOf)}`
                  : `Week of ${formatWeek(thisWeekStart)}`}
              </p>
            </div>
            {activeId && (
              <button
                onClick={() => handleDelete(activeId)}
                disabled={deletingId === activeId}
                className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
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
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
                  <input
                    type="number"
                    min={0}
                    value={fields[key] as number}
                    onChange={(e) =>
                      setField(key, Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800"
                  />
                </div>
              ))}
            </div>

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
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
                  <textarea
                    value={fields[key] as string}
                    onChange={(e) => setField(key, e.target.value)}
                    placeholder={placeholder}
                    rows={2}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none dark:bg-gray-800"
                  />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
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
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
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

              {activeId && (
                <button
                  onClick={startNewReview}
                  className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Close
                </button>
              )}

              {summaryError && (
                <p className="text-xs text-amber-600 w-full">{summaryError}</p>
              )}
            </div>
          </div>

          {/* AI summary */}
          {parsedSummary && (
            <div className="border-t border-gray-50 dark:border-gray-800 px-4 py-4 space-y-3">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                AI summary
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {parsedSummary.summary}
              </p>
              {parsedSummary.steps.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    Next steps
                  </p>
                  {parsedSummary.steps.map((step, i) => (
                    <div key={i} className="flex gap-2">
                      <i
                        className="ti ti-arrow-right text-emerald-500 text-sm shrink-0 mt-0.5"
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
      {reviews.length === 0 && activeId === null && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <i className="ti ti-calendar-week text-gray-400 dark:text-gray-500 text-xl" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            No weekly reviews yet. Start your first one above.
          </p>
          <button
            onClick={startNewReview}
            className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <i className="ti ti-plus text-sm" aria-hidden="true" />
            Start this week&apos;s review
          </button>
        </div>
      )}

      {/* Past reviews */}
      {reviews.filter((r) => r.id !== activeId).length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Past reviews
            </p>
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
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {review.applicationsSent} sent · {review.interviewsBooked} interviews ·{" "}
                        {review.responsesReceived} responses
                        {review.aiSummary && (
                          <span className="ml-1.5 text-emerald-600">· AI summary</span>
                        )}
                      </p>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => loadReview(review)}
                        className="text-xs font-medium text-gray-400 hover:text-emerald-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(review.id)}
                        disabled={deletingId === review.id}
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
                        } text-gray-300 dark:text-gray-600 text-sm`}
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
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
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
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                              AI summary
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                              {parsed.summary}
                            </p>
                            {parsed.steps.map((step, i) => (
                              <div key={i} className="flex gap-2">
                                <i
                                  className="ti ti-arrow-right text-emerald-500 text-sm shrink-0 mt-0.5"
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
