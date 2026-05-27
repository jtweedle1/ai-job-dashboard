"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getCompany, updateCompany, deleteCompany } from "@/lib/companies";
import { getJob } from "@/lib/jobs";
import EditableField from "@/components/EditableField";
import type { Company } from "@/types/company";
import type { Job } from "@/types/job";

const PROFILE_FIELDS: { key: keyof Company; label: string; placeholder: string }[] = [
  { key: "whatTheyDo",       label: "What they do",       placeholder: "Describe what this company does…" },
  { key: "productSummary",   label: "Product summary",    placeholder: "Summarise their main product or service…" },
  { key: "targetCustomers",  label: "Target customers",   placeholder: "Who do they sell to?…" },
  { key: "recentNews",       label: "Recent news",        placeholder: "Any notable recent news or announcements…" },
  { key: "values",           label: "Values",             placeholder: "Company values or culture notes…" },
  { key: "competitors",      label: "Competitors",        placeholder: "Main competitors in their space…" },
  { key: "whyInterested",    label: "Why interested",     placeholder: "Why does this company appeal to you?…" },
];

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CompanyProfilePage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [linkedJob, setLinkedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filling, setFilling] = useState(false);
  const [fillError, setFillError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!user) return;
    getCompany(user.uid, companyId).then(async (c) => {
      if (!c) { setNotFound(true); setLoading(false); return; }
      setCompany(c);
      if (c.jobId) {
        const job = await getJob(user.uid, c.jobId);
        setLinkedJob(job);
      }
      setLoading(false);
    });
  }, [user, companyId]);

  const save = useCallback(
    async (patch: Partial<Omit<Company, "id" | "createdAt">>) => {
      if (!user || !company) return;
      setCompany((prev) => (prev ? { ...prev, ...patch } : prev));
      await updateCompany(user.uid, companyId, patch);
    },
    [user, company, companyId]
  );

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function handleAutoFill() {
    if (!user) return;
    setFilling(true);
    setFillError("");
    try {
      const res = await fetch("/api/company-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, companyId }),
      });
      const data = await res.json();
      if (res.status === 401 || data.error === "no_key") {
        setFillError("Add your Anthropic API key in Settings to use AI auto-fill.");
        return;
      }
      if (data.error) {
        setFillError("Auto-fill failed. Try again.");
        return;
      }
      setCompany((prev) =>
        prev
          ? {
              ...prev,
              whatTheyDo:      data.whatTheyDo      ?? prev.whatTheyDo,
              productSummary:  data.productSummary  ?? prev.productSummary,
              targetCustomers: data.targetCustomers ?? prev.targetCustomers,
              recentNews:      data.recentNews      ?? prev.recentNews,
              values:          data.values          ?? prev.values,
              competitors:     data.competitors     ?? prev.competitors,
            }
          : prev
      );
      showToast("Fields filled — review and edit as needed");
    } catch {
      setFillError("Something went wrong. Try again.");
    } finally {
      setFilling(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    setDeleting(true);
    await deleteCompany(user.uid, companyId);
    router.push("/companies");
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-7 bg-gray-100 rounded w-48" />
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-32 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (notFound || !company) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center pt-20">
        <p className="text-sm text-gray-500 mb-4">Company not found.</p>
        <button
          onClick={() => router.push("/companies")}
          className="text-sm text-emerald-600 hover:underline"
        >
          Back to companies
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
          <i className="ti ti-circle-check text-emerald-400 text-base" aria-hidden="true" />
          {toast}
        </div>
      )}

      {/* Back */}
      <button
        onClick={() => router.push("/companies")}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-5"
      >
        <i className="ti ti-arrow-left text-sm" aria-hidden="true" />
        Companies
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <EditableField
            value={company.name}
            onSave={(v) => { if (v.trim()) { save({ name: v.trim() }); showToast("Name updated"); } }}
            placeholder="Company name"
            className="text-xl font-semibold text-gray-900 px-0 hover:bg-transparent"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          <button
            onClick={handleAutoFill}
            disabled={filling}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {filling ? (
              <i className="ti ti-loader-2 animate-spin text-xs" aria-hidden="true" />
            ) : (
              <i className="ti ti-wand text-xs" aria-hidden="true" />
            )}
            {filling ? "Filling…" : "Auto-fill with AI"}
          </button>

          {deleteConfirm ? (
            <>
              <span className="text-xs text-gray-500">Delete?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                {deleting ? "Deleting…" : "Yes"}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                No
              </button>
            </>
          ) : (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="text-gray-300 hover:text-red-400 transition-colors"
              aria-label="Delete company"
            >
              <i className="ti ti-trash text-sm" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-1 px-3">Updated {formatDate(company.updatedAt)}</p>
      {fillError && (
        <p className="text-xs text-amber-600 mb-5 px-3">{fillError}</p>
      )}
      {!fillError && <div className="mb-6" />}

      {/* Linked job */}
      <div className="bg-white border border-gray-100 rounded-xl mb-4">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Linked role</p>
        </div>
        {linkedJob ? (
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{linkedJob.title}</p>
              <p className="text-xs text-gray-400">{linkedJob.company}</p>
            </div>
            <button
              onClick={() => router.push(`/applications/${linkedJob.id}`)}
              className="text-xs text-emerald-600 hover:underline shrink-0 ml-4"
            >
              View job
            </button>
          </div>
        ) : (
          <div className="px-4 py-3">
            <p className="text-sm text-gray-400">No role linked to this company.</p>
          </div>
        )}
      </div>

      {/* Profile fields */}
      <div className="bg-white border border-gray-100 rounded-xl mb-4">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Research notes</p>
        </div>
        <div className="divide-y divide-gray-50">
          {PROFILE_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className="px-4 py-3">
              <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
              <EditableField
                value={company[key] as string | null}
                placeholder={placeholder}
                multiline
                rows={3}
                onSave={(v) => {
                  save({ [key]: v.trim() || null });
                  showToast("Saved");
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
