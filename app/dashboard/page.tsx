"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authedFetch } from "@/lib/api-client";
import { getJobs } from "@/lib/jobs";
import { getResumes } from "@/lib/resumes";
import { getCoverLetters } from "@/lib/coverLetters";
import { getInterviewPreps } from "@/lib/interviewPreps";
import { getDebriefs } from "@/lib/debriefs";
import { getWritingSamples } from "@/lib/writingSamples";
import { nextActions, JOB_STEPS, type JobActivity } from "@/lib/next-steps";
import AddJobModal from "@/components/AddJobModal";
import type { Job } from "@/types/job";

function greeting(now: Date) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function countBy(ids: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

interface SetupState {
  resume: boolean;
  voice: boolean;
  job: boolean;
  key: boolean;
}

export default function TodayPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activity, setActivity] = useState<Map<string, JobActivity>>(new Map());
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getJobs(user.uid),
      getResumes(user.uid),
      getCoverLetters(user.uid),
      getInterviewPreps(user.uid),
      getDebriefs(user.uid),
      getWritingSamples(user.uid),
      authedFetch("/api/settings/api-key")
        .then((r) => r.json())
        .then((d) => !!d.hasKey)
        .catch(() => false),
    ]).then(([j, r, letters, preps, debriefs, samples, hasKey]) => {
      const l = countBy(letters.map((x) => x.jobId));
      const p = countBy(preps.map((x) => x.jobId));
      const d = countBy(debriefs.map((x) => x.jobId));
      const map = new Map<string, JobActivity>();
      for (const job of j) map.set(job.id, { letters: l.get(job.id) ?? 0, preps: p.get(job.id) ?? 0, debriefs: d.get(job.id) ?? 0 });
      setJobs(j);
      setActivity(map);
      setSetup({
        resume: r.length > 0,
        voice: samples.length > 0 || letters.some((x) => x.useAsVoiceSample),
        job: j.length > 0,
        key: hasKey,
      });
      setLoading(false);
    });
  }, [user]);

  const now = useMemo(() => new Date(), []);
  const actions = useMemo(
    () => nextActions(jobs, (id) => activity.get(id) ?? { letters: 0, preps: 0, debriefs: 0 }, now),
    [jobs, activity, now]
  );

  const firstName = user?.isAnonymous ? "" : user?.displayName?.split(" ")[0] ?? "";
  const weekAgo = now.getTime() - 7 * 86_400_000;
  const appliedThisWeek = jobs.filter((j) => j.appliedAt && j.appliedAt.getTime() >= weekAgo).length;
  const pipeline = [
    { label: "Saved", count: jobs.filter((j) => j.stage === "saved").length },
    { label: "Applied", count: jobs.filter((j) => j.stage === "applied").length },
    { label: "Interviewing", count: jobs.filter((j) => j.stage === "phone_screen" || j.stage === "interview").length },
    { label: "Offers", count: jobs.filter((j) => j.stage === "offer").length },
  ];
  const reviewDay = [5, 6, 0].includes(now.getDay());

  const setupSteps = setup
    ? [
        { done: setup.resume, label: "Add your resume", detail: "Letters and fit scores start here.", href: "/resumes" },
        { done: setup.voice, label: "Share something you wrote", detail: "So letters sound like you.", href: "/voice" },
        { done: setup.job, label: "Add your first job", detail: "Paste a link or a description.", onClick: () => setModalOpen(true) },
        { done: setup.key, label: "Connect your Anthropic key", detail: "Switches on the writing help.", href: "/settings" },
      ]
    : [];
  const setupLeft = setupSteps.filter((s) => !s.done).length;

  function handleSaved(job: Job) {
    setModalOpen(false);
    router.push(`/applications/${job.id}`);
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-40 bg-white/60 dark:bg-gray-800 rounded-4xl" />
        <div className="h-64 bg-white/60 dark:bg-gray-800 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {modalOpen && <AddJobModal onClose={() => setModalOpen(false)} onSaved={handleSaved} />}

      {/* Hello */}
      <section className="relative overflow-hidden rounded-4xl glow-gradient px-6 py-8 sm:px-8 mb-6">
        <div className="absolute -right-10 -top-12 w-48 h-48 rounded-full sun-orb opacity-70 blur-[2px]" aria-hidden="true" />
        <div className="absolute right-24 bottom-[-4.5rem] w-40 h-40 rounded-full bg-white/40 dark:bg-white/10" aria-hidden="true" />
        <div className="relative max-w-lg">
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-gray-900 dark:text-white">
            {greeting(now)}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-2 text-gray-700 dark:text-gray-200">
            {actions.length === 0
              ? jobs.length === 0
                ? "Let's set things up. It takes about five minutes."
                : "You're all caught up. Nice work."
              : `${actions.length} small thing${actions.length !== 1 ? "s" : ""} to move your search forward.`}
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-5 inline-flex items-center gap-1.5 bg-white/90 dark:bg-white/15 text-gray-900 dark:text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-sm hover:bg-white dark:hover:bg-white/25 transition-colors"
          >
            <i className="ti ti-plus text-sm" aria-hidden="true" />
            Add a job
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* First run */}
          {setupLeft > 0 && (
            <section className="surface p-5">
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h2 className="section-label">Get set up</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {setupSteps.length - setupLeft} of {setupSteps.length} done
                </span>
              </div>
              <ol className="space-y-1">
                {setupSteps.map((s, i) => {
                  const body = (
                    <>
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          s.done ? "bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300" : "glow-gradient text-gray-700 dark:text-gray-100"
                        }`}
                      >
                        {s.done ? <i className="ti ti-check" aria-hidden="true" /> : i + 1}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-sm font-medium ${s.done ? "text-gray-400 dark:text-gray-500 line-through" : "text-gray-900 dark:text-gray-50"}`}>
                          {s.label}
                        </span>
                        {!s.done && <span className="block text-xs text-gray-500 dark:text-gray-400">{s.detail}</span>}
                      </span>
                      {!s.done && <i className="ti ti-arrow-right text-gray-300 dark:text-gray-600" aria-hidden="true" />}
                    </>
                  );
                  const cls = "w-full flex items-center gap-3 px-2 py-2 rounded-2xl text-left hover:bg-white/70 dark:hover:bg-white/5 transition-colors";
                  return (
                    <li key={s.label}>
                      {s.done ? (
                        <div className="flex items-center gap-3 px-2 py-2">{body}</div>
                      ) : s.href ? (
                        <Link href={s.href} className={cls}>{body}</Link>
                      ) : (
                        <button onClick={s.onClick} className={cls}>{body}</button>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* Next steps */}
          <section className="surface p-5">
            <h2 className="section-label mb-3">Up next</h2>
            {actions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {jobs.length === 0
                  ? "Add a job and HuntDesk will walk you through it, one step at a time."
                  : "Nothing waiting on you. Add another role when you find one you like."}
              </p>
            ) : (
              <ul className="space-y-1">
                {actions.slice(0, 6).map((a) => {
                  const step = JOB_STEPS.find((s) => s.id === a.step)!;
                  return (
                    <li key={a.jobId}>
                      <Link
                        href={`/applications/${a.jobId}?step=${a.step}`}
                        className="flex items-center gap-3 px-2 py-2.5 rounded-2xl hover:bg-white/70 dark:hover:bg-white/5 transition-colors group"
                      >
                        <span className="w-10 h-10 rounded-2xl glow-gradient flex items-center justify-center shrink-0">
                          <i className={`ti ${step.icon} text-lg text-gray-700 dark:text-gray-100`} aria-hidden="true" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-gray-900 dark:text-gray-50">{a.action}</span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400 line-clamp-2 sm:line-clamp-1">
                            {a.title} · {a.company} · {a.detail}
                          </span>
                        </span>
                        <i className="ti ti-arrow-right text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {actions.length > 6 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 px-2">
                And {actions.length - 6} more in <Link href="/applications" className="text-primary-600 hover:underline">your jobs</Link>.
              </p>
            )}
          </section>
        </div>

        <div className="space-y-4">
          {/* This week */}
          <section className={`p-5 rounded-3xl ${reviewDay ? "glow-gradient" : "surface"}`}>
            <h2 className="section-label mb-1">This week</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {appliedThisWeek === 0
                ? "No applications sent yet this week."
                : `${appliedThisWeek} application${appliedThisWeek !== 1 ? "s" : ""} sent. That's real progress.`}
            </p>
            <Link
              href="/weekly-review"
              className={`mt-4 inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                reviewDay
                  ? "bg-white/90 dark:bg-white/15 text-gray-900 dark:text-white hover:bg-white"
                  : "text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950 hover:bg-primary-100 dark:hover:bg-primary-900"
              }`}
            >
              <i className="ti ti-calendar-heart text-sm" aria-hidden="true" />
              {reviewDay ? "Time for your weekly review" : "Weekly review"}
            </Link>
          </section>

          {/* Pipeline */}
          <section className="surface p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="section-label">Your pipeline</h2>
              <Link href="/analytics" className="text-xs text-primary-600 hover:underline">Progress</Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {pipeline.map((p) => (
                <Link
                  key={p.label}
                  href="/applications"
                  className="rounded-2xl bg-white/70 dark:bg-white/5 px-3 py-3 hover:bg-white dark:hover:bg-white/10 transition-colors"
                >
                  <span className="block text-2xl font-display font-extrabold text-gray-900 dark:text-gray-50">{p.count}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{p.label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
