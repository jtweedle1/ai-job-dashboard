"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getJobs } from "@/lib/jobs";
import AddJobModal from "@/components/AddJobModal";
import {
  STAGE_META,
  SOURCE_LABELS,
  ALL_STAGES,
  ALL_SOURCES,
  type Job,
  type JobStage,
  type JobSource,
} from "@/types/job";

type SortKey = "title" | "company" | "source" | "stage" | "createdAt" | "fitScore";
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
  if (!active) return <i className="ti ti-selector text-gray-300 text-xs ml-1" aria-hidden="true" />;
  return dir === "asc"
    ? <i className="ti ti-sort-ascending text-gray-600 text-xs ml-1" aria-hidden="true" />
    : <i className="ti ti-sort-descending text-gray-600 text-xs ml-1" aria-hidden="true" />;
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [stageFilter, setStageFilter] = useState<JobStage | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<JobSource | "all">("all");

  useEffect(() => {
    if (user) {
      getJobs(user.uid).then((data) => {
        setJobs(data);
        setLoading(false);
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

  function handleSaved(job: Job) {
    setJobs((prev) => [job, ...prev]);
    setModalOpen(false);
    setToast("Job added");
    setTimeout(() => setToast(""), 3000);
  }

  const filtered = useMemo(() => {
    let list = [...jobs];
    if (stageFilter !== "all") list = list.filter((j) => j.stage === stageFilter);
    if (sourceFilter !== "all") list = list.filter((j) => j.source === sourceFilter);
    list.sort((a, b) => {
      let av: string | number | Date | null;
      let bv: string | number | Date | null;
      switch (sortKey) {
        case "title":        av = a.title.toLowerCase();    bv = b.title.toLowerCase();    break;
        case "company":      av = a.company.toLowerCase();  bv = b.company.toLowerCase();  break;
        case "source":       av = a.source;                 bv = b.source;                 break;
        case "stage":        av = a.stage;                  bv = b.stage;                  break;
        case "fitScore":     av = a.fitScore ?? -1;         bv = b.fitScore ?? -1;         break;
        case "createdAt":
        default:             av = a.createdAt;              bv = b.createdAt;              break;
      }
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [jobs, stageFilter, sourceFilter, sortKey, sortDir]);

  const hasFilters = stageFilter !== "all" || sourceFilter !== "all";

  const thClass =
    "px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap select-none cursor-pointer hover:text-gray-800 transition-colors";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
          <i className="ti ti-circle-check text-emerald-400 text-base" aria-hidden="true" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Applications</h1>
          <p className="text-sm text-gray-500">{jobs.length} job{jobs.length !== 1 ? "s" : ""} tracked</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <i className="ti ti-plus text-sm" aria-hidden="true" />
          Add job
        </button>
      </div>

      {/* Filters */}
      {jobs.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as JobStage | "all")}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All stages</option>
            {ALL_STAGES.map((s) => (
              <option key={s} value={s}>{STAGE_META[s].label}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as JobSource | "all")}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All sources</option>
            {ALL_SOURCES.map((s) => (
              <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
            ))}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setStageFilter("all"); setSourceFilter("all"); }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-40" />
              <div className="h-4 bg-gray-100 rounded w-28" />
              <div className="h-4 bg-gray-100 rounded w-20 ml-auto" />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <i className="ti ti-file-text text-gray-400 text-2xl" aria-hidden="true" />
          </div>
          <h2 className="text-sm font-medium text-gray-900 mb-1">No applications yet</h2>
          <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
            Add your first job to start tracking your search.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <i className="ti ti-plus text-sm" aria-hidden="true" />
            Add job
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-500 mb-2">No jobs match your filters.</p>
          <button
            onClick={() => { setStageFilter("all"); setSourceFilter("all"); }}
            className="text-sm text-emerald-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className={thClass} onClick={() => handleSort("title")}>
                  Role <SortIcon active={sortKey === "title"} dir={sortDir} />
                </th>
                <th className={thClass} onClick={() => handleSort("company")}>
                  Company <SortIcon active={sortKey === "company"} dir={sortDir} />
                </th>
                <th className={`${thClass} hidden sm:table-cell`} onClick={() => handleSort("source")}>
                  Source <SortIcon active={sortKey === "source"} dir={sortDir} />
                </th>
                <th className={thClass} onClick={() => handleSort("stage")}>
                  Stage <SortIcon active={sortKey === "stage"} dir={sortDir} />
                </th>
                <th className={`${thClass} hidden md:table-cell`} onClick={() => handleSort("createdAt")}>
                  Added <SortIcon active={sortKey === "createdAt"} dir={sortDir} />
                </th>
                <th className={`${thClass} hidden lg:table-cell`} onClick={() => handleSort("fitScore")}>
                  Fit <SortIcon active={sortKey === "fitScore"} dir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => router.push(`/applications/${job.id}`)}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">{job.title}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{job.company}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-gray-500">{SOURCE_LABELS[job.source]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StageBadge stage={job.stage} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-gray-400">{formatDate(job.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-gray-400">
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
