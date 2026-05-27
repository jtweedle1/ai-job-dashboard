"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getJobs } from "@/lib/jobs";
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
    <div className="bg-white border border-gray-100 rounded-xl mb-4">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-900">By source</h2>
        <a href="/analytics" className="text-xs text-emerald-600 hover:underline">
          Full analytics
        </a>
      </div>
      <div className="px-5 py-4 space-y-3">
        {stats.map((s) => (
          <div key={s.source}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">{s.source}</span>
              <span className="text-xs text-gray-400">
                {s.applications} app{s.applications !== 1 ? "s" : ""}
                {s.interviews > 0 && ` · ${s.responseRate}% response`}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
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

  useEffect(() => {
    if (user) {
      getJobs(user.uid).then((data) => {
        setJobs(data);
        setLoading(false);
      });
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
          <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {user?.displayName ? `Welcome back, ${user.displayName.split(" ")[0]}` : "Welcome to HuntDesk"}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <i className="ti ti-plus text-sm" aria-hidden="true" />
          Add job
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
            <i className={`ti ${s.icon} text-lg ${s.color} mb-2 block`} aria-hidden="true" />
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent applications */}
      <div className="bg-white border border-gray-100 rounded-xl mb-4">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Recent applications</h2>
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
          <div className="divide-y divide-gray-50">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-4 px-5 py-3 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-36" />
                <div className="h-4 bg-gray-100 rounded w-24" />
                <div className="h-5 bg-gray-100 rounded-full w-16 ml-auto" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <i className="ti ti-briefcase text-gray-300 text-xl" aria-hidden="true" />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Add your first job to get started.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <i className="ti ti-plus text-sm" aria-hidden="true" />
              Add job
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recent.map((job) => (
              <button
                key={job.id}
                onClick={() => router.push(`/applications/${job.id}`)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                  <p className="text-xs text-gray-400 truncate">{job.company}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <StageBadge stage={job.stage} />
                  <span className="text-xs text-gray-400 hidden sm:block">{formatDate(job.createdAt)}</span>
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
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-900">AI features</h2>
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
            <i className="ti ti-lock text-xs" aria-hidden="true" />
            Requires API key
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Add your Anthropic API key in{" "}
          <a href="/settings" className="text-emerald-600 hover:underline">Settings</a>{" "}
          to unlock JD extraction, cover letter generation, fit scoring, and more.
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
              className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 opacity-60"
            >
              <i className={`ti ${f.icon} text-gray-500 text-sm`} aria-hidden="true" />
              <span className="text-xs text-gray-600">{f.label}</span>
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
