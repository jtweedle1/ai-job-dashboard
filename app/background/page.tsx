"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getBackgrounds,
  createBackground,
  updateBackground,
  setBackgroundIncluded,
  deleteBackground,
  type BackgroundInput,
} from "@/lib/backgrounds";
import Toggle from "@/components/Toggle";
import { BACKGROUND_QUESTIONS, backgroundHeading, hasBackgroundContent } from "@/types/background";
import type { Background } from "@/types/background";
import StoryTabs from "@/components/StoryTabs";

const cardClass = "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl mb-4";
const cardHeaderClass = "px-4 py-3 border-b border-gray-50 dark:border-gray-800";
const cardTitleClass = "text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest";
const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800";
const primaryButtonClass =
  "flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryButtonClass =
  "flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50";

const EMPTY_FORM: BackgroundInput = { title: "", company: "", startDate: "", endDate: "", answers: {} };

function answeredCount(b: Background) {
  return BACKGROUND_QUESTIONS.filter((q) => (b.answers[q.id] ?? "").trim()).length;
}

export default function BackgroundPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);

  // null = form closed, "new" = adding, otherwise the id being edited.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BackgroundInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!user) return;
    getBackgrounds(user.uid).then((b) => {
      setBackgrounds(b);
      setLoading(false);
    });
  }, [user]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditingId("new");
  }

  function openEdit(b: Background) {
    setForm({ title: b.title, company: b.company, startDate: b.startDate, endDate: b.endDate, answers: { ...b.answers } });
    setEditingId(b.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setAnswer(id: string, value: string) {
    setForm((f) => ({ ...f, answers: { ...f.answers, [id]: value } }));
  }

  const canSave =
    (form.title.trim() || form.company.trim()).length > 0 && hasBackgroundContent(form.answers);

  async function handleSave() {
    if (!user || !editingId || !canSave) return;
    setSaving(true);
    const data: BackgroundInput = {
      title: form.title.trim(),
      company: form.company.trim(),
      startDate: form.startDate.trim(),
      endDate: form.endDate.trim(),
      answers: Object.fromEntries(
        Object.entries(form.answers)
          .map(([k, v]) => [k, v.trim()])
          .filter(([, v]) => v)
      ),
    };
    try {
      if (editingId === "new") {
        const id = await createBackground(user.uid, data);
        const now = new Date();
        setBackgrounds((prev) => [{ id, ...data, included: true, createdAt: now, updatedAt: now }, ...prev]);
        showToast("Position saved");
      } else {
        await updateBackground(user.uid, editingId, data);
        setBackgrounds((prev) =>
          prev.map((b) => (b.id === editingId ? { ...b, ...data, updatedAt: new Date() } : b))
        );
        showToast("Changes saved");
      }
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(b: Background, included: boolean) {
    if (!user) return;
    setBackgrounds((prev) => prev.map((x) => (x.id === b.id ? { ...x, included } : x)));
    await setBackgroundIncluded(user.uid, b.id, included);
  }

  async function handleDelete(id: string) {
    if (!user) return;
    await deleteBackground(user.uid, id);
    setBackgrounds((prev) => prev.filter((b) => b.id !== id));
    setDeleteConfirm(null);
    if (editingId === id) setEditingId(null);
    showToast("Deleted");
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-7 bg-gray-100 dark:bg-gray-800 rounded w-48" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
    );
  }

  const includedCount = backgrounds.filter((b) => b.included).length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
          <i className="ti ti-circle-check text-emerald-400 text-base" aria-hidden="true" />
          {toast}
        </div>
      )}

      <StoryTabs />

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">My background</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The real stories behind each job. Cover letters draw from the positions you switch on, so you
            don&apos;t have to retell them every time.
          </p>
        </div>
        {editingId === null && (
          <button onClick={openNew} className={`${primaryButtonClass} shrink-0`}>
            <i className="ti ti-plus text-sm" aria-hidden="true" />
            Add position
          </button>
        )}
      </div>

      {/* Add / edit form */}
      {editingId !== null && (
        <div className={cardClass}>
          <div className={cardHeaderClass}>
            <p className={cardTitleClass}>{editingId === "new" ? "New position" : "Edit position"}</p>
          </div>
          <div className="px-4 py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Job title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Product Designer"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Company</label>
                <input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="e.g. Acme Co"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Start</label>
                <input
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  placeholder="e.g. Mar 2021"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">End</label>
                <input
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  placeholder="e.g. Present"
                  className={inputClass}
                />
              </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500">
              Answer as many as you like, in bullets or paragraphs. Skip anything that doesn&apos;t apply. Only
              write what&apos;s true; the AI treats this as fact.
            </p>

            {BACKGROUND_QUESTIONS.map((q) => (
              <div key={q.id}>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">{q.label}</label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">{q.hint}</p>
                <textarea
                  value={form.answers[q.id] ?? ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  rows={4}
                  className={`${inputClass} resize-y`}
                />
              </div>
            ))}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingId(null)}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !canSave} className={primaryButtonClass}>
                {saving ? "Saving…" : "Save position"}
              </button>
            </div>
            {!canSave && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                Add a title or company and answer at least one question to save.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Saved positions */}
      {backgrounds.length > 0 ? (
        <div className={cardClass}>
          <div className={`${cardHeaderClass} flex items-center justify-between gap-4`}>
            <p className={cardTitleClass}>Positions</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {includedCount} of {backgrounds.length} used in cover letters
            </p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {backgrounds.map((b) => (
              <div key={b.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                      {backgroundHeading(b)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {answeredCount(b)} of {BACKGROUND_QUESTIONS.length} questions answered
                    </p>
                  </button>
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => openEdit(b)} className={secondaryButtonClass}>
                      <i className="ti ti-pencil text-xs" aria-hidden="true" />
                      Edit
                    </button>
                    {deleteConfirm === b.id ? (
                      <span className="flex items-center gap-2 text-xs">
                        <button onClick={() => handleDelete(b.id)} className="text-red-500 font-medium">
                          Delete
                        </button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-gray-400">
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(b.id)}
                        className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors"
                        aria-label="Delete position"
                      >
                        <i className="ti ti-trash text-sm" aria-hidden="true" />
                      </button>
                    )}
                    <Toggle
                      checked={b.included}
                      onChange={(v) => handleToggle(b, v)}
                      label={`Use ${backgroundHeading(b)} in cover letters`}
                    />
                  </div>
                </div>
                {expandedId === b.id && (
                  <div className="mt-3 space-y-3">
                    {BACKGROUND_QUESTIONS.filter((q) => (b.answers[q.id] ?? "").trim()).map((q) => (
                      <div key={q.id}>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{q.label}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {b.answers[q.id]}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        editingId === null && (
          <div className={`${cardClass} p-10 text-center`}>
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <i className="ti ti-briefcase text-gray-400 dark:text-gray-500 text-xl" aria-hidden="true" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No positions yet. Add one and answer a few questions about what you did there.
            </p>
          </div>
        )
      )}
    </div>
  );
}
