"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid))
      .then((snap) => setGoals(snap.data()?.goals ?? ""))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { goals });
      setToast("Goals saved");
      setTimeout(() => setToast(""), 3000);
    } catch {
      // silently fail — goals are non-critical
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg shadow-gray-900/20">
          <i className="ti ti-circle-check text-primary-300 text-base" aria-hidden="true" />
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="page-title">Goals</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          What you&apos;re looking for. Fit scores on each job are measured against this.
        </p>
      </div>

      <div className="surface p-5 space-y-3">
        <label htmlFor="goals" className="section-label block">
          What would make the next role a yes?
        </label>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Income needs, growth path, interests, deal-breakers. Plain sentences are fine.
        </p>
        {loading ? (
          <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
        ) : (
          <textarea
            id="goals"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="e.g. Looking for a senior IC role at a Series B–D startup. Interested in developer tools or data infrastructure. Targeting $180k–$220k. Remote-first preferred."
            rows={7}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm bg-white/80 dark:bg-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
          />
        )}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-primary-600 px-5 py-2 rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />}
            {saving ? "Saving…" : "Save goals"}
          </button>
        </div>
      </div>
    </div>
  );
}
