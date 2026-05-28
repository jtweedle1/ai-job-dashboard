"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { getJobs } from "@/lib/jobs";
import { createAnswer, getAnswers, updateAnswer, deleteAnswer } from "@/lib/answerBank";
import type { Job } from "@/types/job";
import type { AnswerEntry } from "@/types/answerBank";

function parseTags(s: string): string[] {
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function AnswerBankPage() {
  const { user } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [answers, setAnswers] = useState<AnswerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ question: "", answer: "", tags: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([getJobs(user.uid), getAnswers(user.uid)]).then(([j, a]) => {
      setJobs(j);
      setAnswers(a);
      setLoading(false);
    });
  }, [user]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleSave() {
    if (!user || !question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      const data = {
        question: question.trim(),
        answer: answer.trim(),
        tags: parseTags(tagsInput),
        jobId: selectedJobId || null,
      };
      const id = await createAnswer(user.uid, data);
      const newEntry: AnswerEntry = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
      setAnswers((prev) => [newEntry, ...prev]);
      setQuestion("");
      setAnswer("");
      setTagsInput("");
      setSelectedJobId("");
      showToast("Saved to answer bank");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(entry: AnswerEntry) {
    setEditingId(entry.id);
    setEditFields({
      question: entry.question,
      answer: entry.answer,
      tags: entry.tags.join(", "),
    });
    setExpandedId(entry.id);
  }

  async function handleEditSave(id: string) {
    if (!user) return;
    setEditSaving(true);
    const patch = {
      question: editFields.question.trim(),
      answer: editFields.answer.trim(),
      tags: parseTags(editFields.tags),
    };
    await updateAnswer(user.uid, id, patch);
    setAnswers((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date() } : a))
    );
    setEditingId(null);
    setEditSaving(false);
    showToast("Updated");
  }

  async function handleDelete(id: string) {
    if (!user) return;
    setDeletingId(id);
    await deleteAnswer(user.uid, id);
    setAnswers((prev) => prev.filter((a) => a.id !== id));
    if (expandedId === id) setExpandedId(null);
    if (editingId === id) setEditingId(null);
    setDeletingId(null);
    showToast("Deleted");
  }

  function jobTitle(jobId: string | null) {
    if (!jobId) return null;
    return jobs.find((j) => j.id === jobId)?.title ?? null;
  }

  const allTags = useMemo(() => {
    const set = new Set<string>();
    answers.forEach((a) => a.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [answers]);

  const filtered = useMemo(() => {
    let result = answers;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.question.toLowerCase().includes(q) || a.answer.toLowerCase().includes(q)
      );
    }
    if (activeTag) {
      result = result.filter((a) => a.tags.includes(activeTag));
    }
    return result;
  }, [answers, search, activeTag]);

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-7 bg-gray-100 dark:bg-gray-800 rounded w-36" />
        <div className="h-56 bg-gray-100 dark:bg-gray-800 rounded-xl" />
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
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Answer bank</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {answers.length} answer{answers.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Add form */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl mb-4">
        <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">Add answer</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Tell me about a time you led a project under pressure"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Answer</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your prepared answer…"
              rows={4}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none dark:bg-gray-800"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                Tags <span className="text-gray-300 dark:text-gray-600">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="behavioral, leadership, STAR"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                Link to job <span className="text-gray-300 dark:text-gray-600">(optional)</span>
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">No job linked</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} — {j.company}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={!question.trim() || !answer.trim() || saving}
            className="flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
            ) : null}
            {saving ? "Saving…" : "Save answer"}
          </button>
        </div>
      </div>

      {/* Filters */}
      {answers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-48">
            <i
              className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 text-sm"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions and answers…"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800"
            />
          </div>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? "" : tag)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                activeTag === tag
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Answer cards */}
      {filtered.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl divide-y divide-gray-50 dark:divide-gray-800">
          {filtered.map((entry) => (
            <div key={entry.id} className="px-4 py-3">
              {editingId === entry.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Question</label>
                    <input
                      type="text"
                      value={editFields.question}
                      onChange={(e) =>
                        setEditFields((p) => ({ ...p, question: e.target.value }))
                      }
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Answer</label>
                    <textarea
                      value={editFields.answer}
                      onChange={(e) =>
                        setEditFields((p) => ({ ...p, answer: e.target.value }))
                      }
                      rows={5}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tags</label>
                    <input
                      type="text"
                      value={editFields.tags}
                      onChange={(e) =>
                        setEditFields((p) => ({ ...p, tags: e.target.value }))
                      }
                      placeholder="behavioral, leadership"
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditSave(entry.id)}
                      disabled={
                        editSaving ||
                        !editFields.question.trim() ||
                        !editFields.answer.trim()
                      }
                      className="flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      {editSaving ? (
                        <i className="ti ti-loader-2 animate-spin text-xs" aria-hidden="true" />
                      ) : null}
                      {editSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === entry.id ? null : entry.id)
                      }
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{entry.question}</p>
                      {expandedId !== entry.id && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                          {entry.answer}
                        </p>
                      )}
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(entry)}
                        className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                        aria-label="Edit"
                      >
                        <i className="ti ti-pencil text-xs" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="text-gray-200 dark:text-gray-700 hover:text-red-400 transition-colors disabled:opacity-50"
                        aria-label="Delete"
                      >
                        <i className="ti ti-trash text-xs" aria-hidden="true" />
                      </button>
                      <i
                        className={`ti ${
                          expandedId === entry.id ? "ti-chevron-up" : "ti-chevron-down"
                        } text-gray-300 dark:text-gray-600 text-sm`}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {(entry.tags.length > 0 || entry.jobId) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {entry.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setActiveTag(activeTag === tag ? "" : tag)}
                          className="text-xs px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                      {entry.jobId && jobTitle(entry.jobId) && (
                        <>
                          <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {jobTitle(entry.jobId)}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {expandedId === entry.id && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
                      {entry.answer}
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {answers.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <i className="ti ti-bookmarks text-gray-400 dark:text-gray-500 text-xl" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No answers saved yet. Add your first one above.
          </p>
        </div>
      )}

      {answers.length > 0 && filtered.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">No answers match your search.</p>
        </div>
      )}
    </div>
  );
}
