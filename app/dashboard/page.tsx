"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authedFetch } from "@/lib/api-client";
import { getJobs, updateJob } from "@/lib/jobs";
import { getResumes } from "@/lib/resumes";
import { getCoverLetters } from "@/lib/coverLetters";
import { getInterviewPreps } from "@/lib/interviewPreps";
import { getDebriefs } from "@/lib/debriefs";
import { getWritingSamples } from "@/lib/writingSamples";
import { getReviews } from "@/lib/weeklyReviews";
import { nextActions, type JobActivity } from "@/lib/next-steps";
import { comingUp, trailStations, weekSummary } from "@/lib/today";
import AddJobModal from "@/components/AddJobModal";
import Toast from "@/components/Toast";
import { NextStepHero, CaughtUpHero, FirstJobHero, SetupHero, type SetupStep } from "@/components/today/TodayHero";
import ActionQueue from "@/components/today/ActionQueue";
import ComingUp from "@/components/today/ComingUp";
import WeekCard from "@/components/today/WeekCard";
import SearchTrail from "@/components/today/SearchTrail";
import type { JobPatch } from "@/components/today/QuickActions";
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

// Settled reads fail soft to an empty list; only the jobs read is allowed to fail the page.
function orEmpty<T>(r: PromiseSettledResult<T[]>): T[] {
  return r.status === "fulfilled" ? r.value : [];
}

interface TodayData {
  jobs: Job[];
  activity: Map<string, JobActivity>;
  letterDates: Date[];
  interviewDates: Date[];
  reviewWeeks: Date[];
  setup: { resume: boolean; voice: boolean; key: boolean };
}

interface ToastState {
  message: string;
  undo?: () => void;
  tone?: "done" | "error";
}

const TOAST_MS = 6000;

export default function TodayPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<TodayData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>({ message: "" });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!user) return;
    let live = true;
    Promise.allSettled([
      getJobs(user.uid),
      getResumes(user.uid),
      getCoverLetters(user.uid),
      getInterviewPreps(user.uid),
      getDebriefs(user.uid),
      getWritingSamples(user.uid),
      getReviews(user.uid),
      authedFetch("/api/settings/api-key").then((r) => r.json()).then((d) => !!d.hasKey),
    ]).then(([j, r, l, p, d, s, rv, k]) => {
      if (!live) return;
      if (j.status === "rejected") {
        setFailed(true);
        return;
      }
      const letters = orEmpty(l);
      const debriefs = orEmpty(d);
      const lc = countBy(letters.map((x) => x.jobId));
      const pc = countBy(orEmpty(p).map((x) => x.jobId));
      const dc = countBy(debriefs.map((x) => x.jobId));
      const activity = new Map<string, JobActivity>();
      for (const job of j.value) activity.set(job.id, { letters: lc.get(job.id) ?? 0, preps: pc.get(job.id) ?? 0, debriefs: dc.get(job.id) ?? 0 });
      setData({
        jobs: j.value,
        activity,
        letterDates: letters.map((x) => x.createdAt),
        interviewDates: debriefs.map((x) => x.interviewDate),
        reviewWeeks: orEmpty(rv).map((x) => x.weekOf),
        setup: {
          resume: orEmpty(r).length > 0,
          voice: orEmpty(s).length > 0 || letters.some((x) => x.useAsVoiceSample),
          // If we can't tell, don't nag about the key.
          key: k.status === "fulfilled" ? k.value : true,
        },
      });
    });
    return () => {
      live = false;
    };
  }, [user, attempt]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const hideToastIn = useCallback((ms: number) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ message: "" }), ms);
  }, []);

  const showToast = useCallback(
    (message: string, undo?: () => void, tone?: ToastState["tone"]) => {
      setToast({ message, undo, tone });
      hideToastIn(TOAST_MS);
    },
    [hideToastIn]
  );

  const now = useMemo(() => new Date(), []);
  const jobs = useMemo(() => data?.jobs ?? [], [data]);
  const jobsById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const actions = useMemo(
    () => nextActions(jobs, (id) => data?.activity.get(id) ?? { letters: 0, preps: 0, debriefs: 0 }, now),
    [jobs, data, now]
  );
  const upcoming = useMemo(() => comingUp(jobs, now), [jobs, now]);
  const trail = useMemo(() => trailStations(jobs), [jobs]);
  const week = useMemo(
    () => (data ? weekSummary({ jobs, letterDates: data.letterDates, interviewDates: data.interviewDates, reviewWeeks: data.reviewWeeks }, now) : null),
    [data, jobs, now]
  );

  const topId = actions[0]?.jobId;

  // Applies a patch on screen first, saves it, and offers Undo. A failed save puts the job back.
  const act = useCallback(
    async (job: Job, patch: JobPatch, message: string) => {
      if (!user) return;
      const before = Object.fromEntries(Object.keys(patch).map((k) => [k, job[k as keyof JobPatch]])) as JobPatch;
      const apply = (p: JobPatch) =>
        setData((d) => d && { ...d, jobs: d.jobs.map((j) => (j.id === job.id ? { ...j, ...p, updatedAt: new Date() } : j)) });

      apply(patch);
      // The row (or hero) that was acted on is about to change, so keep keyboard focus nearby.
      if (job.id === topId) document.getElementById("today-hero")?.focus();
      else queueHeading.current?.focus();
      try {
        await updateJob(user.uid, job.id, patch);
      } catch {
        apply(before);
        showToast("Couldn't save that. Check your connection and try again.", undefined, "error");
        return;
      }
      showToast(message, async () => {
        apply(before);
        setToast({ message: "" });
        try {
          await updateJob(user.uid, job.id, before);
          showToast("Undone");
        } catch {
          apply(patch);
          showToast("Couldn't undo that. Try again from the job page.", undefined, "error");
        }
      });
    },
    [user, showToast, topId]
  );

  function handleSaved(job: Job) {
    setModalOpen(false);
    router.push(`/applications/${job.id}`);
  }

  if (failed) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="surface p-8 text-center" role="alert">
          <div className="w-12 h-12 rounded-full glow-gradient flex items-center justify-center mx-auto mb-4">
            <i className="ti ti-cloud-off text-2xl text-gray-700 dark:text-gray-100" aria-hidden="true" />
          </div>
          <h1 className="page-title mb-1">We couldn&apos;t load your day</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Your jobs didn&apos;t come through. Check your connection and try again.</p>
          <button
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
            className="inline-flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-sm shadow-primary-600/20 hover:bg-primary-700 transition-colors"
          >
            <i className="ti ti-refresh text-sm" aria-hidden="true" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data || !week) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-pulse space-y-4" aria-busy="true">
        <span className="sr-only">Loading your day</span>
        <div className="h-6 w-56 bg-white/60 dark:bg-gray-800 rounded-full" />
        <div className="h-44 bg-white/60 dark:bg-gray-800 rounded-4xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-56 lg:col-span-2 bg-white/60 dark:bg-gray-800 rounded-3xl" />
          <div className="h-40 bg-white/60 dark:bg-gray-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  const firstName = user?.isAnonymous ? "" : user?.displayName?.split(" ")[0] ?? "";
  const setupSteps: SetupStep[] = [
    { done: data.setup.resume, label: "Add your resume", detail: "Letters and fit scores start here.", href: "/resumes" },
    { done: data.setup.voice, label: "Share something you wrote", detail: "So letters sound like you.", href: "/voice" },
    { done: jobs.length > 0, label: "Add your first job", detail: "Paste a link or a description.", onClick: () => setModalOpen(true) },
    { done: data.setup.key, label: "Connect your Anthropic key", detail: "Switches on the writing help.", href: "/settings" },
  ];
  const setupDone = setupSteps.filter((s) => s.done).length;
  const nextSetup = setupSteps.find((s) => !s.done);
  const setupAsHero = setupDone <= 1;
  const [top, ...rest] = actions;
  const topJob = top && jobsById.get(top.jobId);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {modalOpen && <AddJobModal onClose={() => setModalOpen(false)} onSaved={handleSaved} />}
      <Toast
        message={toast.message}
        tone={toast.tone}
        action={toast.undo && { label: "Undo", onClick: toast.undo }}
        onHold={() => toastTimer.current && clearTimeout(toastTimer.current)}
        onRelease={() => hideToastIn(3000)}
      />

      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {greeting(now)}
            {firstName ? `, ${firstName}` : ""}.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-5 min-h-10 pointer-coarse:min-h-11 rounded-full shadow-sm shadow-primary-600/20 hover:bg-primary-700 transition-colors"
        >
          <i className="ti ti-plus text-sm" aria-hidden="true" />
          Add a job
        </button>
      </header>

      {!setupAsHero && nextSetup && (
        <SetupPill done={setupDone} total={setupSteps.length} step={nextSetup} />
      )}

      {setupAsHero ? (
        <SetupHero steps={setupSteps} />
      ) : top && topJob ? (
        <NextStepHero action={top} job={topJob} onAct={act} now={now} />
      ) : jobs.length === 0 ? (
        <FirstJobHero onAdd={() => setModalOpen(true)} />
      ) : (
        <CaughtUpHero next={upcoming[0]} onAdd={() => setModalOpen(true)} now={now} />
      )}

      {jobs.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {rest.length > 0 && (
              <div className="lg:col-span-2">
                <ActionQueue ref={queueHeading} actions={rest} jobs={jobsById} onAct={act} now={now} />
              </div>
            )}
            {/* On phones the aside dissolves into the grid so Coming up can sit above the queue. */}
            <div className="contents lg:block lg:col-start-3 lg:space-y-4">
              <div className="order-first lg:order-none empty:hidden">
                <ComingUp interviews={upcoming} now={now} />
              </div>
              <WeekCard week={week} />
            </div>
          </div>
          <SearchTrail stations={trail.stations} closed={trail.closed} />
        </>
      )}
    </div>
  );
}

function SetupPill({ done, total, step }: { done: number; total: number; step: SetupStep }) {
  const cls =
    "inline-flex items-center gap-2 max-w-full text-sm px-4 py-2 rounded-full bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/5 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-white/10 transition-colors";
  const body = (
    <>
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 tabular-nums">
        Setup {done} of {total}
      </span>
      <span className="truncate">{step.label}</span>
      <i className="ti ti-arrow-right text-sm text-gray-500 dark:text-gray-400" aria-hidden="true" />
    </>
  );
  return step.href ? (
    <Link href={step.href} className={cls}>{body}</Link>
  ) : (
    <button onClick={step.onClick} className={cls}>{body}</button>
  );
}
