"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getJobs } from "@/lib/jobs";
import { authedFetch } from "@/lib/api-client";
import AddJobModal from "@/components/AddJobModal";
import { STAGE_META, SOURCE_LABELS, type Job, type JobStage } from "@/types/job";
import { getSourceStats } from "@/lib/analytics";

function StageBadge({ stage }: { stage: JobStage }) {
  const meta = STAGE_META[stage];
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${meta.badge}`}>
      {meta.label}
    </span>
  );
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SourceBreakdown({ jobs, totalApplied }: { jobs: Job[]; totalApplied: number }) {
  const stats = getSourceStats(jobs);
  if (stats.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl mb-4">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-sm font-medium text-gray-900 dark:text-gray-50">By source</h2>
        <a href="/analytics" className="text-xs text-emerald-600 hover:underline">
          Full analytics
        </a>
      </div>
      <div className="px-5 py-4 space-y-3">
        {stats.map((s) => (
          <div key={s.source}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 dark:text-gray-300">{s.source}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {s.applications} app{s.applications !== 1 ? "s" : ""}
                {s.interviews > 0 && ` · ${s.responseRate}% response`}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.round((s.applications / totalApplied) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) {
      getJobs(user.uid).then((data) => {
        setJobs(data);
        setLoading(false);
      });
      authedFetch("/api/settings/api-key")
        .then((r) => r.json())
        .then((d) => setHasApiKey(!!d.hasKey))
        .catch(() => setHasApiKey(false));
    }
  }, [user]);

  const totalApplied = jobs.filter((j) => j.stage !== "saved").length;
  const interviews = jobs.filter((j) => j.stage === "interview").length;
  const offers = jobs.filter((j) => j.stage === "offer").length;
  const scored = jobs.filter((j) => j.fitScore != null);
  const avgFitScore =
    scored.length > 0
      ? Math.round(scored.reduce((sum, j) => sum + j.fitScore!, 0) / scored.length)
      : null;

  const recent = jobs.slice(0, 5);

  const stats = [
    {
      label: "Total applied",
      value: loading ? "—" : String(totalApplied),
      sub: totalApplied === 0 ? "No applications yet" : "",
      icon: "ti-send",
      color: "text-blue-500",
    },
    {
      label: "Interviews",
      value: loading ? "—" : String(interviews),
      sub: totalApplied > 0
        ? `${Math.round((interviews / totalApplied) * 100)}% response rate`
        : "0% response rate",
      icon: "ti-microphone",
      color: "text-purple-500",
    },
    {
      label: "Offers",
      value: loading ? "—" : String(offers),
      sub: offers === 0 ? "—" : `${offers} offer${offers !== 1 ? "s" : ""}`,
      icon: "ti-trophy",
      color: "text-emerald-600",
    },
    {
      label: "Avg fit score",
      value: loading ? "—" : avgFitScore != null ? String(avgFitScore) : "—",
      sub: avgFitScore == null ? "Add a resume in Settings" : `Across ${scored.length} scored jobs`,
      icon: "ti-target",
      color: "text-amber-500",
    },
  ];

  function handleSaved(job: Job) {
    setJobs((prev) => [job, ...prev]);
    setModalOpen(false);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {user?.displayName ? `Welcome back, ${user.displayName.split(" ")[0]}` : "Welcome to HuntDesk"}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
        >
          <i className="ti ti-plus text-sm" aria-hidden="true" />
          Add job
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
            <i className={`ti ${s.icon} text-lg ${s.color} mb-2 block`} aria-hidden="true" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50">{s.value}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent applications */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl mb-4">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-medium text-gray-900 dark:text-gray-50">Recent applications</h2>
          {jobs.length > 0 && (
            <button
              onClick={() => router.push("/applications")}
              className="text-xs text-emerald-600 hover:underline"
            >
              View all
            </button>
          )}
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-4 px-5 py-3 animate-pulse">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-36" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-24" />
                <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-full w-16 ml-auto" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <i className="ti ti-briefcase text-gray-300 dark:text-gray-600 text-xl" aria-hidden="true" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Add your first job to get started.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              <i className="ti ti-plus text-sm" aria-hidden="true" />
              Add job
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {recent.map((job) => (
              <button
                key={job.id}
                onClick={() => router.push(`/applications/${job.id}`)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{job.title}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{job.company}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <StageBadge stage={job.stage} />
                  <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">{formatDate(job.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Source breakdown */}
      {!loading && totalApplied > 0 && (
        <SourceBreakdown jobs={jobs} totalApplied={totalApplied} />
      )}

      {/* AI features panel */}
      <div className={`bg-white dark:bg-gray-900 border rounded-xl p-5 ${hasApiKey ? "border-emerald-200 dark:border-emerald-800" : "border-gray-100 dark:border-gray-800"}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-900 dark:text-gray-50">AI features</h2>
          {hasApiKey ? (
            <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded-md">
              <i className="ti ti-check text-xs" aria-hidden="true" />
              Active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded-md">
              <i className="ti ti-lock text-xs" aria-hidden="true" />
              Requires API key
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {hasApiKey ? (
            <>Your Anthropic API key is connected. AI tools are available on job and company detail pages.</>
          ) : (
            <>
              Add your Anthropic API key in{" "}
              <a href="/settings" className="text-emerald-600 hover:underline">Settings</a>{" "}
              to unlock JD extraction, cover letter generation, fit scoring, and more.
            </>
          )}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { icon: "ti-wand", label: "Extract JD" },
            { icon: "ti-mail", label: "Cover letter" },
            { icon: "ti-target", label: "Fit score" },
            { icon: "ti-microphone", label: "Interview prep" },
            { icon: "ti-building-store", label: "Company research" },
            { icon: "ti-calendar-stats", label: "Weekly summary" },
          ].map((f) => (
            <div
              key={f.label}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 ${
                hasApiKey
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                  : "bg-gray-50 dark:bg-gray-800 opacity-60"
              }`}
            >
              <i className={`ti ${f.icon} text-sm ${hasApiKey ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"}`} aria-hidden="true" />
              <span className={`text-xs ${hasApiKey ? "text-emerald-700 dark:text-emerald-400" : "text-gray-600 dark:text-gray-400"}`}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <AddJobModal onClose={() => setModalOpen(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}
