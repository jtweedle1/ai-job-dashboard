"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getJobs, deleteJob } from "@/lib/jobs";
import { getCoverLetters } from "@/lib/coverLetters";
import { getInterviewPreps } from "@/lib/interviewPreps";
import { getDebriefs } from "@/lib/debriefs";
import { nextActions, timeAgo, type JobActivity, type NextAction } from "@/lib/next-steps";
import AddJobModal from "@/components/AddJobModal";
import Toast from "@/components/Toast";
import { useToast } from "@/lib/use-toast";
import PageFrame from "@/components/ui/PageFrame";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Dialog from "@/components/ui/Dialog";
import { inputClasses } from "@/components/ui/Field";
import { Checkbox, EmptyState, Monogram, Skeleton, StageIndicator } from "@/components/ui/bits";
import { Signpost } from "@/components/illustrations";
import {
  STAGE_META,
  SOURCE_LABELS,
  ALL_STAGES,
  ALL_SOURCES,
  STAGE_GROUPS,
  TRAIL_GROUPS,
  fitWord,
  isStageFilter,
  matchesStageFilter,
  type Job,
  type JobSource,
  type StageFilter,
  type StageGroup,
  type TrailGroup,
} from "@/types/job";

type SortKey = "title" | "company" | "createdAt" | "updatedAt" | "fitScore";
type SortDir = "asc" | "desc";

// One sort menu instead of arrows on every column header (DESIGN.md: job listings).
const SORTS = {
  added: { label: "Recently added", key: "createdAt", dir: "desc" },
  updated: { label: "Recently updated", key: "updatedAt", dir: "desc" },
  oldest: { label: "Oldest first", key: "createdAt", dir: "asc" },
  fit: { label: "Best fit", key: "fitScore", dir: "desc" },
  company: { label: "Company A to Z", key: "company", dir: "asc" },
  role: { label: "Role A to Z", key: "title", dir: "asc" },
} as const satisfies Record<string, { label: string; key: SortKey; dir: SortDir }>;
type SortId = keyof typeof SORTS;

const SORT_OPTIONS = (Object.keys(SORTS) as SortId[]).map((id) => ({ value: id, label: SORTS[id].label }));
const STAGE_OPTIONS: { value: StageFilter | "all"; label: string }[] = [
  { value: "all", label: "All stages" },
  ...(Object.keys(STAGE_GROUPS) as StageGroup[]).map((g) => ({ value: g, label: `${STAGE_GROUPS[g].label} (all)` })),
  ...ALL_STAGES.map((s) => ({ value: s, label: STAGE_META[s].label })),
];
const SOURCE_OPTIONS: { value: JobSource | "all"; label: string }[] = [
  { value: "all", label: "All sources" },
  ...ALL_SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] })),
];

// The node where each stretch of the journey hangs off the trail.
const GROUP_NODE: Record<TrailGroup, string> = {
  exploring: "border-[1.5px] border-stone bg-canvas",
  applied: "bg-sky",
  talking: "bg-sun",
  decided: "bg-moss",
};

const FIT_TONE = { moss: "text-moss", "ink-soft": "text-ink-soft", stone: "text-stone" } as const;

function JobRow({
  job,
  next,
  now,
  editing,
  selected,
  onToggle,
}: {
  job: Job;
  next?: NextAction;
  now: Date;
  editing: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const fit = job.fitScore != null ? fitWord(job.fitScore) : null;
  const facts = (
    <>
      {fit && (
        <>
          <span className={`font-semibold ${FIT_TONE[fit.tone]}`}>
            {fit.word} · {job.fitScore}
          </span>
          <span aria-hidden="true"> · </span>
        </>
      )}
      <span className="sr-only">Updated </span>
      {timeAgo(job.updatedAt, now)}
    </>
  );
  return (
    <li className={`flex items-center gap-3 border-b border-rule last:border-b-0 ${selected ? "bg-action-wash -mx-3 px-3 rounded-field" : ""}`}>
      {editing && <Checkbox checked={selected} onChange={onToggle} aria-label={`Select ${job.title} at ${job.company}`} />}
      {/* Phones: role, company and facts on the left, the stage top right, the next step last.
          Wider: role | next step | stage over facts. */}
      <Link
        href={`/applications/${job.id}`}
        className="group flex-1 min-w-0 grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_minmax(0,1fr)_minmax(0,16rem)_9rem] items-start md:items-center gap-x-4 gap-y-1 py-3.5 px-3 -mx-3 rounded-field hover:bg-well transition-colors duration-100"
      >
        <Monogram name={job.company} />
        <span className="min-w-0">
          <span className="block font-semibold text-ink md:truncate">{job.title}</span>
          <span className="block text-meta text-ink-soft md:truncate">
            {job.company}
            {job.location && ` · ${job.location}`}
          </span>
          <span className="block md:hidden mt-0.5 text-note text-ink-muted">{facts}</span>
        </span>
        {next ? (
          <span className="col-start-2 col-span-2 md:col-start-auto md:col-span-1 row-start-2 md:row-start-auto min-w-0 text-meta md:text-base text-ink flex items-center gap-1.5">
            <span className="sr-only">Next step: </span>
            <span className="md:truncate">{next.action}</span>
            <i className="ti ti-arrow-right text-ink-soft shrink-0 group-hover:translate-x-0.5 transition-transform duration-100" aria-hidden="true" />
          </span>
        ) : (
          <span className="hidden md:block" />
        )}
        <span className="col-start-3 row-start-1 md:col-start-auto md:row-start-auto flex flex-col items-end text-right gap-0.5 pt-0.5 md:pt-0">
          <StageIndicator stage={job.stage} />
          <span className="hidden md:block text-note text-ink-muted whitespace-nowrap">{facts}</span>
        </span>
      </Link>
    </li>
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

  const [sort, setSort] = useState<SortId>("added");
  const [stageFilter, setStageFilter] = useState<StageFilter | "all">(isStageFilter(stageParam) ? stageParam : "all");
  const [sourceFilter, setSourceFilter] = useState<JobSource | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [now] = useState(() => new Date());

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
    const { key: sortKey, dir: sortDir } = SORTS[sort];
    list.sort((a, b) => {
      let av: string | number | Date | null;
      let bv: string | number | Date | null;
      switch (sortKey) {
        case "title":        av = a.title.toLowerCase();    bv = b.title.toLowerCase();    break;
        case "company":      av = a.company.toLowerCase();  bv = b.company.toLowerCase();  break;
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
  }, [jobs, stageFilter, sourceFilter, search, sort]);

  // The sorted list, cut into stretches of the journey. Groups always run in journey order; the
  // chosen sort holds inside each one.
  const groups = useMemo(
    () => TRAIL_GROUPS.map((g) => ({ ...g, jobs: filtered.filter((j) => STAGE_META[j.stage].group === g.id) })),
    [filtered]
  );

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
    setConfirming(false);
    setDeleting(true);
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map((id) => deleteJob(user.uid, id)));
    const gone = new Set(ids.filter((_, i) => results[i].status === "fulfilled"));
    setJobs((prev) => prev.filter((j) => !gone.has(j.id)));
    setSelectedIds(new Set(ids.filter((id) => !gone.has(id))));
    setDeleting(false);
    if (gone.size === count) {
      showToast(`${count} job${count !== 1 ? "s" : ""} deleted`);
      setEditing(false);
    }
    else showToast(`Deleted ${gone.size} of ${count}. The rest are still selected; try again.`, { tone: "error" });
  }

  const hasFilters = stageFilter !== "all" || sourceFilter !== "all" || search.trim() !== "";
  const clearFilters = () => {
    setStageFilter("all");
    setSourceFilter("all");
    setSearch("");
  };

  const count = selectedIds.size;
  const filtering = stageFilter !== "all" || sourceFilter !== "all" || search.trim() !== "";
  const doneEditing = () => {
    setEditing(false);
    setSelectedIds(new Set());
  };

  return (
    <PageFrame
      width="wide"
      title="Your jobs"
      intro={loading ? undefined : `${jobs.length} job${jobs.length !== 1 ? "s" : ""} on your trail`}
      action={
        <Button variant="primary" icon="ti-plus" onClick={() => setModalOpen(true)}>
          Add a job
        </Button>
      }
    >
      <Toast {...toastProps} />

      {jobs.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-8">
          <div className="relative w-full sm:w-64">
            <i className="ti ti-search absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search by role or company"
              placeholder="Search role or company"
              className={`${inputClasses} h-10 pl-10 rounded-full`}
            />
          </div>
          <Select look="pill" value={stageFilter} options={STAGE_OPTIONS} onChange={setStageFilter} ariaLabel="Filter by stage" />
          <Select look="pill" value={sourceFilter} options={SOURCE_OPTIONS} onChange={setSourceFilter} ariaLabel="Filter by source" />
          <Select look="pill" prefix="Sort:" value={sort} options={SORT_OPTIONS} onChange={setSort} ariaLabel="Sort jobs" />
          {hasFilters && (
            <Button variant="quiet" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
          <Button variant="quiet" size="sm" className="ml-auto" aria-pressed={editing} onClick={() => (editing ? doneEditing() : setEditing(true))}>
            {editing ? "Done" : "Edit"}
          </Button>
        </div>
      )}

      {loading ? (
        <div aria-busy="true" role="status" className="space-y-1">
          <span className="sr-only">Loading your jobs…</span>
          <Skeleton className="h-4 w-28 mb-4" />
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center gap-4 py-3.5">
              <Skeleton className="w-9 h-9" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-56 max-w-full" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          art={<Signpost />}
          title="Every trail starts with one saved role"
          action={
            <Button variant="primary" icon="ti-plus" onClick={() => setModalOpen(true)}>
              Add a job
            </Button>
          }
        >
          Paste a link or a job description and Wayfinder fills in the rest.
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nothing matches those filters"
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className={editing ? "pb-24" : undefined}>
          {editing && (
            <label className="mb-4 inline-flex items-center gap-3 text-ui text-ink-soft cursor-pointer">
              <Checkbox ref={selectAllRef} checked={allFilteredSelected} onChange={handleToggleAll} />
              Select all {filtered.length}
            </label>
          )}
          <ol className="relative">
            {groups
              .filter((g) => !filtering || g.jobs.length > 0)
              .map((g, i, shown) => (
                <li key={g.id} className="relative pl-8 pb-8 last:pb-0">
                  {/* The trail runs down the left edge, from this group's node to the next. */}
                  {i < shown.length - 1 && <span className="absolute left-[7px] top-4 bottom-0 w-0.5 rounded-full bg-rule" aria-hidden="true" />}
                  <span className={`absolute left-0.5 top-[5px] w-3 h-3 rounded-full ${GROUP_NODE[g.id]}`} aria-hidden="true" />
                  <section aria-labelledby={`group-${g.id}`}>
                    <h2 id={`group-${g.id}`} className="text-label font-semibold text-ink">
                      {g.label}
                      <span className="font-normal text-ink-muted"> · {g.jobs.length}</span>
                    </h2>
                    {g.jobs.length > 0 && (
                      <ul className="mt-1">
                        {g.jobs.map((job) => (
                          <JobRow
                            key={job.id}
                            job={job}
                            next={next.get(job.id)}
                            now={now}
                            editing={editing}
                            selected={selectedIds.has(job.id)}
                            onToggle={() => handleToggleSelect(job.id)}
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                </li>
              ))}
          </ol>
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
          title={`Delete ${count} job${count !== 1 ? "s" : ""}?`}
          description={`${count !== 1 ? "Their" : "Its"} letters, prep and interview notes go too. This can't be undone.`}
          onRequestClose={() => setConfirming(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button variant="danger-solid" onClick={handleDeleteSelected}>
                Delete {count === 1 ? "job" : `${count} jobs`}
              </Button>
            </>
          }
        />
      )}

      {modalOpen && <AddJobModal onClose={() => setModalOpen(false)} onSaved={handleSaved} />}
    </PageFrame>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense>
      <ApplicationsList />
    </Suspense>
  );
}
