"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getCompanies, createCompany, deleteCompany } from "@/lib/companies";
import { getJobs } from "@/lib/jobs";
import type { Company } from "@/types/company";
import type { Job } from "@/types/job";
import { timeAgo } from "@/lib/next-steps";
import { useToast } from "@/lib/use-toast";
import Toast from "@/components/Toast";
import PageFrame from "@/components/ui/PageFrame";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Select from "@/components/ui/Select";
import { Field, Input } from "@/components/ui/Field";
import { Checkbox, EmptyState, Monogram, Skeleton } from "@/components/ui/bits";

export default function CompaniesPage() {
  const { user } = useAuth();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { show: showToast, toastProps } = useToast();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [now] = useState(() => new Date());

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
    setConfirming(false);
    setDeleting(true);
    await Promise.all([...selectedIds].map((id) => deleteCompany(user.uid, id)));
    setCompanies((prev) => prev.filter((c) => !selectedIds.has(c.id)));
    setSelectedIds(new Set());
    setDeleting(false);
    setEditing(false);
    showToast(`${count} compan${count !== 1 ? "ies" : "y"} deleted`);
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
        logoUrl: null,
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
      showToast("Company added");
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setNewName("");
    setNewJobId("");
  }

  const count = selectedIds.size;
  const doneEditing = () => {
    setEditing(false);
    setSelectedIds(new Set());
  };
  const jobOptions = [{ value: "", label: "No linked job" }, ...jobs.map((j) => ({ value: j.id, label: `${j.title} at ${j.company}` }))];

  return (
    <PageFrame
      width="wide"
      title="Companies"
      intro={loading ? undefined : `${companies.length} profile${companies.length !== 1 ? "s" : ""}, made when you add a job or by hand`}
      action={
        <Button variant="secondary" icon="ti-plus" onClick={() => setModalOpen(true)}>
          Add a company
        </Button>
      }
    >
      <Toast {...toastProps} />

      {loading ? (
        <div aria-busy="true" role="status">
          <span className="sr-only">Loading companies…</span>
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-4 py-3.5">
              <Skeleton className="w-9 h-9" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : companies.length === 0 ? (
        <EmptyState
          title="No company profiles yet"
          action={
            <Button variant="primary" icon="ti-plus" onClick={() => setModalOpen(true)}>
              Add a company
            </Button>
          }
        >
          A profile is made for you whenever you add a job. You can also add one by hand.
        </EmptyState>
      ) : (
        <div className={editing ? "pb-24" : undefined}>
          <div className="flex items-center justify-between gap-3 mb-2 min-h-9">
            {editing ? (
              <label className="inline-flex items-center gap-3 text-ui text-ink-soft cursor-pointer">
                <Checkbox ref={selectAllRef} checked={allSelected} onChange={handleToggleAll} />
                Select all {companies.length}
              </label>
            ) : (
              <span />
            )}
            <Button variant="quiet" size="sm" aria-pressed={editing} onClick={() => (editing ? doneEditing() : setEditing(true))}>
              {editing ? "Done" : "Edit"}
            </Button>
          </div>
          <ul>
            {companies.map((company) => {
              const linked = jobTitle(company.jobId);
              const selected = selectedIds.has(company.id);
              return (
                <li
                  key={company.id}
                  className={`flex items-center gap-3 border-b border-rule last:border-b-0 ${selected ? "bg-action-wash -mx-3 px-3 rounded-field" : ""}`}
                >
                  {editing && <Checkbox checked={selected} onChange={() => handleToggleSelect(company.id)} aria-label={`Select ${company.name}`} />}
                  <Link
                    href={`/companies/${company.id}`}
                    className="group flex-1 min-w-0 flex items-center gap-4 py-3.5 px-3 -mx-3 rounded-field hover:bg-well transition-colors duration-100"
                  >
                    <Monogram name={company.name} logoUrl={company.logoUrl} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-ink truncate">{company.name}</span>
                      <span className="block text-meta text-ink-soft truncate">{linked ?? "No linked role"}</span>
                    </span>
                    <span className="shrink-0 text-note text-ink-muted">
                      <span className="sr-only">Updated </span>
                      {timeAgo(company.updatedAt, now)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {editing && (
        <div className="fixed bottom-0 inset-x-0 md:left-[232px] z-30 px-4 sm:px-6 lg:px-10 pb-4 pointer-events-none">
          <div
            role="region"
            aria-label="Bulk actions"
            className="pointer-events-auto mx-auto max-w-[65rem] flex items-center gap-3 flex-wrap px-5 py-3 rounded-sheet bg-raised shadow-overlay animate-[sheet-up_200ms_var(--ease-out)]"
          >
            <span className="flex-1 text-ui text-ink" aria-live="polite">
              {count === 0 ? "None selected" : `${count} selected`}
            </span>
            <Button variant="quiet" onClick={doneEditing}>
              Done
            </Button>
            <Button variant="danger-solid" icon="ti-trash" disabled={count === 0} loading={deleting} loadingLabel="Deleting…" onClick={() => setConfirming(true)}>
              Delete{count > 0 ? ` ${count}` : ""}
            </Button>
          </div>
        </div>
      )}

      {confirming && (
        <Dialog
          title={`Delete ${count} compan${count !== 1 ? "ies" : "y"}?`}
          description="Their research notes go too. Your jobs stay. This can't be undone."
          onRequestClose={() => setConfirming(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button variant="danger-solid" onClick={handleDeleteSelected}>
                Delete
              </Button>
            </>
          }
        />
      )}

      {modalOpen && (
        <Dialog
          title="Add a company"
          onRequestClose={closeModal}
          footer={
            <>
              <Button variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={!newName.trim()} loading={saving} loadingLabel="Saving…">
                Add company
              </Button>
            </>
          }
        >
          <div className="space-y-5">
            <Field id="company-new-name" label="Company name">
              <Input
                id="company-new-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="e.g. Acme Inc."
                autoFocus
              />
            </Field>
            {jobs.length > 0 && (
              <Field id="company-new-job" label="Link to a job" optional>
                <Select id="company-new-job" value={newJobId} options={jobOptions} onChange={setNewJobId} />
              </Field>
            )}
          </div>
        </Dialog>
      )}
    </PageFrame>
  );
}
