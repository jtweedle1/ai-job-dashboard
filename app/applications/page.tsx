"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getJobs, deleteJob } from "@/lib/jobs";
import { getCoverLetters } from "@/lib/coverLetters";
import { getInterviewPreps } from "@/lib/interviewPreps";
import { getDebriefs } from "@/lib/debriefs";
import { nextActions, type JobActivity, type NextAction } from "@/lib/next-steps";
import AddJobModal from "@/components/AddJobModal";
import Toast from "@/components/Toast";
import { useToast } from "@/lib/use-toast";
import {
  STAGE_META,
  SOURCE_LABELS,
  ALL_STAGES,
  ALL_SOURCES,
  STAGE_GROUPS,
  isStageFilter,
  matchesStageFilter,
  type Job,
  type JobStage,
  type JobSource,
  type StageFilter,
  type StageGroup,
} from "@/types/job";

type SortKey = "title" | "company" | "source" | "stage" | "createdAt" | "updatedAt" | "fitScore";
type SortDir = "asc" | "desc";

function StageBadge({ stage }: { stage: JobStage }) {
  const meta = STAGE_META[stage];
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${meta.badge}`}>
      {meta.label}
    </span>
  );
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <i className="ti ti-selector text-gray-400 dark:text-gray-500 text-xs ml-1" aria-hidden="true" />;
  return dir === "asc"
    ? <i className="ti ti-sort-ascending text-gray-600 dark:text-gray-300 text-xs ml-1" aria-hidden="true" />
    : <i className="ti ti-sort-descending text-gray-600 dark:text-gray-300 text-xs ml-1" aria-hidden="true" />;
}

function SortHeader({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
  className = "",
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === col;
  return (
    <th
      scope="col"
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
      className={`px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors rounded"
      >
        {label}
        <SortIcon active={active} dir={sortDir} />
      </button>
    </th>
  );
}

function ApplicationsList() {
  const { user } = useAuth();
  const router = useRouter();
  // Today's trail links here with ?stage=applied, ?stage=interviewing and so on.
  const stageParam = useSearchParams().get("stage");

  const [jobs, setJobs] = useState<Job[]>([]);
  // Each job's next step, by the same rules as Today, so the list and Today always agree.
  const [next, setNext] = useState<Map<string, NextAction>>(new Map());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { show: showToast, toastProps } = useToast();

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [stageFilter, setStageFilter] = useState<StageFilter | "all">(isStageFilter(stageParam) ? stageParam : "all");
  const [sourceFilter, setSourceFilter] = useState<JobSource | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      getJobs(user.uid).then((data) => {
        setJobs(data);
        setLoading(false);
        // Next steps are a bonus; if these reads fail the list still works without them.
        Promise.allSettled([getCoverLetters(user.uid), getInterviewPreps(user.uid), getDebriefs(user.uid)]).then(([l, p, d]) => {
          const ids = (r: PromiseSettledResult<{ jobId: string }[]>) => (r.status === "fulfilled" ? r.value.map((x) => x.jobId) : []);
          const count = (list: string[], id: string) => list.filter((x) => x === id).length;
          const [letters, preps, debriefs] = [ids(l), ids(p), ids(d)];
          const activity = (id: string): JobActivity => ({ letters: count(letters, id), preps: count(preps, id), debriefs: count(debriefs, id) });
          setNext(new Map(nextActions(data, activity).map((a) => [a.jobId, a])));
        });
      });
    }
  }, [user]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // A new job opens straight into its first step.
  function handleSaved(job: Job) {
    setModalOpen(false);
    router.push(`/applications/${job.id}`);
  }

  const filtered = useMemo(() => {
    let list = [...jobs];
    if (stageFilter !== "all") list = list.filter((j) => matchesStageFilter(j.stage, stageFilter));
    if (sourceFilter !== "all") list = list.filter((j) => j.source === sourceFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((j) => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q));
    list.sort((a, b) => {
      let av: string | number | Date | null;
      let bv: string | number | Date | null;
      switch (sortKey) {
        case "title":        av = a.title.toLowerCase();    bv = b.title.toLowerCase();    break;
        case "company":      av = a.company.toLowerCase();  bv = b.company.toLowerCase();  break;
        case "source":       av = a.source;                 bv = b.source;                 break;
        case "stage":        av = a.stage;                  bv = b.stage;                  break;
        case "fitScore":     av = a.fitScore ?? -1;         bv = b.fitScore ?? -1;         break;
        case "updatedAt":    av = a.updatedAt;              bv = b.updatedAt;              break;
        case "createdAt":
        default:             av = a.createdAt;              bv = b.createdAt;              break;
      }
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [jobs, stageFilter, sourceFilter, search, sortKey, sortDir]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((j) => selectedIds.has(j.id));
  const someFilteredSelected = filtered.some((j) => selectedIds.has(j.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someFilteredSelected && !allFilteredSelected;
    }
  }, [someFilteredSelected, allFilteredSelected]);

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleToggleAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((j) => next.delete(j.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((j) => next.add(j.id));
        return next;
      });
    }
  }

  async function handleDeleteSelected() {
    if (!user || selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`Delete ${count} job${count !== 1 ? "s" : ""}, with ${count !== 1 ? "their" : "its"} letters, prep and interview notes? This cannot be undone.`)) return;
    setDeleting(true);
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map((id) => deleteJob(user.uid, id)));
    const gone = new Set(ids.filter((_, i) => results[i].status === "fulfilled"));
    setJobs((prev) => prev.filter((j) => !gone.has(j.id)));
    setSelectedIds(new Set(ids.filter((id) => !gone.has(id))));
    setDeleting(false);
    if (gone.size === count) showToast(`${count} job${count !== 1 ? "s" : ""} deleted`);
    else showToast(`Deleted ${gone.size} of ${count}. The rest are still selected; try again.`, { tone: "error" });
  }

  const hasFilters = stageFilter !== "all" || sourceFilter !== "all" || search.trim() !== "";
  const clearFilters = () => {
    setStageFilter("all");
    setSourceFilter("all");
    setSearch("");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Toast {...toastProps} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">Your jobs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{jobs.length} job{jobs.length !== 1 ? "s" : ""} tracked</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="flex items-center gap-2 bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <i className="ti ti-trash text-sm" aria-hidden="true" />
              {deleting ? "Deleting…" : `Delete ${selectedIds.size}`}
            </button>
          )}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-primary-700 transition-colors"
          >
            <i className="ti ti-plus text-sm" aria-hidden="true" />
            Add job
          </button>
        </div>
      </div>

      {/* Filters */}
      {jobs.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="relative">
            <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search by role or company"
              placeholder="Search role or company"
              className="border border-gray-200 dark:border-gray-700 rounded-full pl-8 pr-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 w-52"
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as StageFilter | "all")}
            aria-label="Filter by stage"
            className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All stages</option>
            {(Object.keys(STAGE_GROUPS) as StageGroup[]).map((g) => (
              <option key={g} value={g}>{STAGE_GROUPS[g].label} (all)</option>
            ))}
            {ALL_STAGES.map((s) => (
              <option key={s} value={s}>{STAGE_META[s].label}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as JobSource | "all")}
            aria-label="Filter by source"
            className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All sources</option>
            {ALL_SOURCES.map((s) => (
              <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
            ))}
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="surface overflow-hidden">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 dark:border-gray-800 animate-pulse">
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-40" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-28" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-20 ml-auto" />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="surface p-12 text-center">
          <div className="w-12 h-12 rounded-full glow-gradient flex items-center justify-center mx-auto mb-4">
            <i className="ti ti-file-text text-gray-700 dark:text-gray-100 text-2xl" aria-hidden="true" />
          </div>
          <h2 className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-1">No applications yet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs mx-auto">
            Add your first job to start tracking your search.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-primary-700 transition-colors"
          >
            <i className="ti ti-plus text-sm" aria-hidden="true" />
            Add job
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface p-10 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No jobs match your filters.</p>
          <button
            onClick={clearFilters}
            className="text-sm text-primary-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-4 py-2.5 w-8">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={handleToggleAll}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    aria-label="Select all"
                  />
                </th>
                <SortHeader label="Role" col="title" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Company" col="company" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Source" col="source" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
                <SortHeader label="Stage" col="stage" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Added" col="createdAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                <SortHeader label="Updated" col="updatedAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="hidden lg:table-cell" />
                <SortHeader label="Fit" col="fitScore" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="hidden lg:table-cell" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => router.push(`/applications/${job.id}`)}
                  className={`border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${selectedIds.has(job.id) ? "bg-primary-50 dark:bg-primary-950 hover:bg-primary-50 dark:hover:bg-primary-950" : ""}`}
                >
                  <td className="px-4 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(job.id)}
                      onChange={() => handleToggleSelect(job.id)}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      aria-label={`Select ${job.title}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {/* The real link for keyboards and screen readers; the row click is a mouse shortcut. */}
                    <Link
                      href={`/applications/${job.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium text-gray-900 dark:text-gray-50 hover:underline rounded"
                    >
                      {job.title}
                    </Link>
                    {next.get(job.id) && (
                      <span className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        <i className="ti ti-arrow-right text-xs" aria-hidden="true" />
                        <span className="sr-only">Next step: </span>
                        {next.get(job.id)!.action}
                        {next.get(job.id)!.chip && <span className="text-gray-500 dark:text-gray-400">· {next.get(job.id)!.chip!.text}</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{job.company}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{SOURCE_LABELS[job.source]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StageBadge stage={job.stage} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(job.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(job.updatedAt)}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {job.fitScore != null ? `${job.fitScore}` : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <AddJobModal onClose={() => setModalOpen(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense>
      <ApplicationsList />
    </Suspense>
  );
}
