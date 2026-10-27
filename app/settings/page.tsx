"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { authedFetch } from "@/lib/api-client";
import Link from "next/link";

type KeyStatus = "loading" | "saved" | "none";

export default function SettingsPage() {
  const { user } = useAuth();

  const [keyStatus, setKeyStatus] = useState<KeyStatus>("loading");
  const [keyInput, setKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [removingKey, setRemovingKey] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [keyToast, setKeyToast] = useState("");


  useEffect(() => {
    if (!user) return;

    authedFetch("/api/settings/api-key")
      .then((r) => r.json())
      .then((d) => setKeyStatus(d.hasKey ? "saved" : "none"))
      .catch(() => setKeyStatus("none"));

  }, [user]);

  function showKeyToast(msg: string) {
    setKeyToast(msg);
    setTimeout(() => setKeyToast(""), 3000);
  }


  async function handleSaveKey() {
    if (!user || !keyInput.trim()) return;
    setSavingKey(true);
    setKeyError("");
    try {
      const res = await authedFetch("/api/settings/api-key", {
        method: "POST",
        body: JSON.stringify({ apiKey: keyInput.trim() }),
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
      await authedFetch("/api/settings/api-key", {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      setKeyStatus("none");
      showKeyToast("API key removed");
    } catch {
      setKeyError("Failed to remove. Try again.");
    } finally {
      setRemovingKey(false);
    }
  }


  const inputClass = "border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {keyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg shadow-gray-900/20">
          <i className="ti ti-circle-check text-primary-400 text-base" aria-hidden="true" />
          {keyToast}
        </div>
      )}

      <h1 className="page-title mb-6">Settings</h1>

      {/* API Key */}
      <div className="surface mb-4">
        <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800">
          <p className="section-label">Anthropic API key</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          {keyStatus === "loading" ? (
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-40 animate-pulse" />
          ) : keyStatus === "saved" ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-500" />
                <span className="text-sm text-gray-700 dark:text-gray-200">Key saved</span>
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add your{" "}
                <span className="font-medium text-gray-700 dark:text-gray-200">Anthropic API key</span>{" "}
                to unlock AI features — JD extraction, cover letter generation, role-fit scoring, and more.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your key is encrypted before being stored. It is never returned to the browser after saving.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
                  placeholder="sk-ant-..."
                  className={`flex-1 ${inputClass} font-mono placeholder-gray-500 dark:placeholder-gray-400`}
                />
                <button
                  onClick={handleSaveKey}
                  disabled={!keyInput.trim() || savingKey}
                  className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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

      {/* Goals moved */}
      <Link
        href="/goals"
        className="surface mb-4 px-5 py-4 flex items-center justify-between gap-4 hover:shadow-md transition-shadow"
      >
        <div>
          <p className="section-label">Career goals</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Now live in Me, next to your resume, stories and voice.</p>
        </div>
        <i className="ti ti-arrow-right text-gray-400" aria-hidden="true" />
      </Link>

      {/* Account */}
      <div className="surface">
        <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800">
          <p className="section-label">Account</p>
        </div>
        <div className="px-4 py-4 space-y-2">
          {user ? (
            <>
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <i className="ti ti-user text-gray-400 dark:text-gray-500 text-sm" aria-hidden="true" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{user.displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Signed in with Google</p>
            </>
          ) : (
            <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-48 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
