"use client";

const stats = [
  { label: "Total applied", value: "0", sub: "No applications yet", icon: "ti-send", color: "text-blue-500" },
  { label: "Interviews", value: "0", sub: "0% response rate", icon: "ti-microphone", color: "text-purple-500" },
  { label: "Offers", value: "0", sub: "—", icon: "ti-trophy", color: "text-emerald-600" },
  { label: "Avg fit score", value: "—", sub: "Add a resume in Settings", icon: "ti-target", color: "text-amber-500" },
];

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome to HuntDesk</p>
        </div>
        <button className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          <i className="ti ti-plus text-sm" aria-hidden="true" />
          Add job
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white border border-gray-100 rounded-xl p-4"
          >
            <i className={`ti ${s.icon} text-lg ${s.color} mb-2 block`} aria-hidden="true" />
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
          <i className="ti ti-briefcase text-gray-400 text-2xl" aria-hidden="true" />
        </div>
        <h2 className="text-sm font-medium text-gray-900 mb-1">
          Add your first job to get started
        </h2>
        <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
          Track applications, generate cover letters, and understand your job search — all in one place.
        </p>
        <button className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          <i className="ti ti-plus text-sm" aria-hidden="true" />
          Add job
        </button>
      </div>

      {/* AI features panel */}
      <div className="mt-4 bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-900">AI features</h2>
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
            <i className="ti ti-lock text-xs" aria-hidden="true" />
            Requires API key
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Add your Anthropic API key in{" "}
          <a href="/settings" className="text-emerald-600 hover:underline">
            Settings
          </a>{" "}
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
    </div>
  );
}