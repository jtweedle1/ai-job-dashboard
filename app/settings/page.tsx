"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type KeyStatus = "loading" | "saved" | "none";

export default function SettingsPage() {
  const { user } = useAuth();

  const [keyStatus, setKeyStatus] = useState<KeyStatus>("loading");
  const [keyInput, setKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [removingKey, setRemovingKey] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [keyToast, setKeyToast] = useState("");

  const [goals, setGoals] = useState("");
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [savingGoals, setSavingGoals] = useState(false);
  const [goalsToast, setGoalsToast] = useState("");

  useEffect(() => {
    if (!user) return;

    fetch(`/api/settings/api-key?uid=${user.uid}`)
      .then((r) => r.json())
      .then((d) => setKeyStatus(d.hasKey ? "saved" : "none"))
      .catch(() => setKeyStatus("none"));

    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        setGoals(snap.data()?.goals ?? "");
        setGoalsLoading(false);
      })
      .catch(() => setGoalsLoading(false));
  }, [user]);

  function showKeyToast(msg: string) {
    setKeyToast(msg);
    setTimeout(() => setKeyToast(""), 3000);
  }

  function showGoalsToast(msg: string) {
    setGoalsToast(msg);
    setTimeout(() => setGoalsToast(""), 3000);
  }

  async function handleSaveKey() {
    if (!user || !keyInput.trim()) return;
    setSavingKey(true);
    setKeyError("");
    try {
      const res = await fetch("/api/settings/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, apiKey: keyInput.trim() }),
      });
      if (!res.ok) throw new Error();
      setKeyStatus("saved");
      setKeyInput("");
      showKeyToast("API key saved");
    } catch {
      setKeyError("Failed to save. Try again.");
    } finally {
      setSavingKey(false);
    }
  }

  async function handleRemoveKey() {
    if (!user) return;
    setRemovingKey(true);
    try {
      await fetch("/api/settings/api-key", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid }),
      });
      setKeyStatus("none");
      showKeyToast("API key removed");
    } catch {
      setKeyError("Failed to remove. Try again.");
    } finally {
      setRemovingKey(false);
    }
  }

  async function handleSaveGoals() {
    if (!user) return;
    setSavingGoals(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { goals });
      showGoalsToast("Goals saved");
    } catch {
      // silently fail — goals are non-critical
    } finally {
      setSavingGoals(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Toasts */}
      {keyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
          <i className="ti ti-circle-check text-emerald-400 text-base" aria-hidden="true" />
          {keyToast}
        </div>
      )}
      {goalsToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
          <i className="ti ti-circle-check text-emerald-400 text-base" aria-hidden="true" />
          {goalsToast}
        </div>
      )}

      <h1 className="text-lg font-semibold text-gray-900 mb-6">Settings</h1>

      {/* API Key */}
      <div className="bg-white border border-gray-100 rounded-xl mb-4">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Anthropic API key</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          {keyStatus === "loading" ? (
            <div className="h-4 bg-gray-100 rounded w-40 animate-pulse" />
          ) : keyStatus === "saved" ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-gray-700">Key saved</span>
              </div>
              <button
                onClick={handleRemoveKey}
                disabled={removingKey}
                className="text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                {removingKey ? "Removing…" : "Remove key"}
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">
                Add your{" "}
                <span className="font-medium text-gray-700">Anthropic API key</span>{" "}
                to unlock AI features — JD extraction, cover letter generation, role-fit scoring, and more.
              </p>
              <p className="text-xs text-gray-400">
                Your key is encrypted before being stored. It is never returned to the browser after saving.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
                  placeholder="sk-ant-..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button
                  onClick={handleSaveKey}
                  disabled={!keyInput.trim() || savingKey}
                  className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {savingKey ? (
                    <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
                  ) : null}
                  {savingKey ? "Saving…" : "Save key"}
                </button>
              </div>
            </>
          )}
          {keyError && <p className="text-xs text-red-500">{keyError}</p>}
        </div>
      </div>

      {/* Career goals */}
      <div className="bg-white border border-gray-100 rounded-xl mb-4">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Career goals</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          <p className="text-xs text-gray-400">
            Used by the role-fit scorer to personalise scores. Describe what you're looking for: income needs, growth path, interests, deal-breakers.
          </p>
          {goalsLoading ? (
            <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g. Looking for a senior IC role at a Series B–D startup. Interested in developer tools or data infrastructure. Targeting $180k–$220k. Remote-first preferred."
              rows={5}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          )}
          <div className="flex justify-end">
            <button
              onClick={handleSaveGoals}
              disabled={goalsLoading || savingGoals}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-gray-900 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingGoals ? (
                <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
              ) : null}
              {savingGoals ? "Saving…" : "Save goals"}
            </button>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="bg-white border border-gray-100 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Account</p>
        </div>
        <div className="px-4 py-4 space-y-2">
          {user ? (
            <>
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <i className="ti ti-user text-gray-400 text-sm" aria-hidden="true" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">Signed in with Google</p>
            </>
          ) : (
            <div className="h-8 bg-gray-100 rounded w-48 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
