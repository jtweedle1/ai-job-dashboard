"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getCompanies, createCompany, deleteCompany } from "@/lib/companies";
import { getJobs } from "@/lib/jobs";
import type { Company } from "@/types/company";
import type { Job } from "@/types/job";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CompaniesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  const [newName, setNewName] = useState("");
  const [newJobId, setNewJobId] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getCompanies(user.uid), getJobs(user.uid)]).then(([c, j]) => {
      setCompanies(c);
      setJobs(j);
      setLoading(false);
    });
  }, [user]);

  const allSelected = companies.length > 0 && companies.every((c) => selectedIds.has(c.id));
  const someSelected = companies.some((c) => selectedIds.has(c.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleToggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(companies.map((c) => c.id)));
    }
  }

  async function handleDeleteSelected() {
    if (!user || selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`Delete ${count} compan${count !== 1 ? "ies" : "y"}? This cannot be undone.`)) return;
    setDeleting(true);
    await Promise.all([...selectedIds].map((id) => deleteCompany(user.uid, id)));
    setCompanies((prev) => prev.filter((c) => !selectedIds.has(c.id)));
    setSelectedIds(new Set());
    setDeleting(false);
    setToast(`${count} compan${count !== 1 ? "ies" : "y"} deleted`);
    setTimeout(() => setToast(""), 3000);
  }

  function jobTitle(jobId: string | null) {
    if (!jobId) return null;
    return jobs.find((j) => j.id === jobId)?.title ?? null;
  }

  async function handleSave() {
    if (!user || !newName.trim()) return;
    setSaving(true);
    try {
      const id = await createCompany(user.uid, {
        name: newName.trim(),
        jobId: newJobId || null,
      });
      const newCompany: Company = {
        id,
        name: newName.trim(),
        jobId: newJobId || null,
        whatTheyDo: null,
        productSummary: null,
        targetCustomers: null,
        recentNews: null,
        values: null,
        competitors: null,
        whyInterested: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setCompanies((prev) => [newCompany, ...prev]);
      closeModal();
      setToast("Company added");
      setTimeout(() => setToast(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setNewName("");
    setNewJobId("");
  }

  const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
          <i className="ti ti-circle-check text-emerald-400 text-base" aria-hidden="true" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Companies</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {companies.length} profile{companies.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="flex items-center gap-2 bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <i className="ti ti-trash text-sm" aria-hidden="true" />
              {deleting ? "Deleting…" : `Delete ${selectedIds.size}`}
            </button>
          )}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <i className="ti ti-plus text-sm" aria-hidden="true" />
            Add company
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-32 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-48 mb-3" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-24" />
            </div>
          ))}
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <i className="ti ti-building text-gray-400 dark:text-gray-500 text-2xl" aria-hidden="true" />
          </div>
          <h2 className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-1">No company profiles yet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs mx-auto">
            Company profiles are created automatically when you add a job, or you can add one manually.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <i className="ti ti-plus text-sm" aria-hidden="true" />
            Add company
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              onChange={handleToggleAll}
              className="rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              aria-label="Select all companies"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {someSelected ? `${selectedIds.size} selected` : "Select all"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {companies.map((company) => {
              const linked = jobTitle(company.jobId);
              const isSelected = selectedIds.has(company.id);
              return (
                <div
                  key={company.id}
                  onClick={() => router.push(`/companies/${company.id}`)}
                  className={`bg-white dark:bg-gray-900 border rounded-xl p-4 cursor-pointer hover:shadow-sm transition-all ${
                    isSelected
                      ? "border-emerald-400 ring-1 ring-emerald-400 bg-emerald-50 dark:bg-emerald-950"
                      : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                      <i className="ti ti-building text-gray-500 dark:text-gray-400 text-sm" aria-hidden="true" />
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(company.id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        aria-label={`Select ${company.name}`}
                      />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-1 truncate">{company.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate mb-2">
                    {linked ? (
                      <span className="flex items-center gap-1">
                        <i className="ti ti-briefcase text-xs" aria-hidden="true" />
                        {linked}
                      </span>
                    ) : (
                      "No linked role"
                    )}
                  </p>
                  <p className="text-xs text-gray-300 dark:text-gray-600">Updated {formatDate(company.updatedAt)}</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add company modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} aria-hidden="true" />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Add company</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close"
              >
                <i className="ti ti-x text-base" aria-hidden="true" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                  Company name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder="e.g. Acme Inc."
                  autoFocus
                  className={inputClass}
                />
              </div>
              {jobs.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Link to job (optional)</label>
                  <select
                    value={newJobId}
                    onChange={(e) => setNewJobId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">No linked job</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} — {j.company}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={closeModal}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!newName.trim() || saving}
                className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  "Add company"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
