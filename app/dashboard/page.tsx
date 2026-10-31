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
import { useToast } from "@/lib/use-toast";
import PageFrame from "@/components/ui/PageFrame";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/bits";
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

export default function TodayPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<TodayData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const { show: showToast, toastProps } = useToast();
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

  // Refreshed whenever the tab comes back into view, so "today" and "tomorrow" stay right overnight.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(new Date());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
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
        showToast("Couldn't save that. Check your connection and try again.", { tone: "error" });
        return;
      }
      // Already saved, so there's nothing to commit; Undo writes the old values back.
      showToast(message, {
        commit: () => {},
        undo: async () => {
          apply(before);
          try {
            await updateJob(user.uid, job.id, before);
            showToast("Undone");
          } catch {
            apply(patch);
            showToast("Couldn't undo that. Try again from the job page.", { tone: "error" });
          }
        },
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
      <PageFrame width="wide">
        <div role="alert">
          <EmptyState
            art={<i className="ti ti-cloud-off text-4xl text-ink-soft" aria-hidden="true" />}
            title="We couldn't load your day"
            action={
              <button
                onClick={() => {
                  setFailed(false);
                  setAttempt((n) => n + 1);
                }}
                className={buttonClasses({ variant: "primary" })}
              >
                <i className="ti ti-refresh" aria-hidden="true" />
                Try again
              </button>
            }
          >
            Your jobs didn&apos;t come through. Check your connection and try again.
          </EmptyState>
        </div>
      </PageFrame>
    );
  }

  if (!data || !week) {
    return (
      <PageFrame width="wide">
        <div aria-busy="true" role="status">
          <span className="sr-only">Loading your day…</span>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-10 w-72 max-w-full rounded-field" />
          <Skeleton className="mt-10 h-56 rounded-sheet" />
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8">
            <div className="lg:col-span-8 space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
            <div className="lg:col-span-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20" />
            </div>
          </div>
        </div>
      </PageFrame>
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
    <PageFrame width="wide">
      {modalOpen && <AddJobModal onClose={() => setModalOpen(false)} onSaved={handleSaved} />}
      <Toast {...toastProps} />

      <header className="flex items-end justify-between gap-x-6 gap-y-4 flex-wrap pt-2 mb-8 sm:mb-10">
        <div className="min-w-0">
          <p className="text-meta font-semibold text-ink-soft">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 font-serif text-title sm:text-display font-semibold text-ink text-balance">
            {greeting(now)}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          {!setupAsHero && nextSetup && <SetupLink done={setupDone} total={setupSteps.length} step={nextSetup} />}
        </div>
        <button onClick={() => setModalOpen(true)} className={buttonClasses({ variant: "secondary", className: "pointer-coarse:min-h-11" })}>
          <i className="ti ti-plus" aria-hidden="true" />
          Add a job
        </button>
      </header>

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
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10 items-start">
            {rest.length > 0 && (
              <div className="lg:col-span-8">
                <ActionQueue ref={queueHeading} actions={rest} jobs={jobsById} onAct={act} now={now} />
              </div>
            )}
            {/* On phones the aside dissolves into the grid so Coming up can sit above the queue. */}
            <div className={`contents ${rest.length > 0 ? "lg:block lg:col-span-4 lg:space-y-10" : "lg:grid lg:col-span-12 lg:grid-cols-2 lg:gap-12"}`}>
              <div className="order-first lg:order-none empty:hidden">
                <ComingUp interviews={upcoming} now={now} />
              </div>
              <WeekCard week={week} />
            </div>
          </div>
          <div className="mt-14 pt-8 border-t border-rule">
            <SearchTrail stations={trail.stations} closed={trail.closed} />
          </div>
        </>
      )}
    </PageFrame>
  );
}

// Once the essentials are in, the rest of setup shrinks to one line under the greeting.
function SetupLink({ done, total, step }: { done: number; total: number; step: SetupStep }) {
  const cls = "mt-3 inline-flex items-center gap-1.5 max-w-full text-meta text-ink-soft hover:text-ink group";
  const body = (
    <>
      <span className="tabular-nums">
        Setup {done} of {total} ·
      </span>
      <span className="font-semibold text-action group-hover:underline underline-offset-4">{step.label}</span>
      <i className="ti ti-arrow-right text-action" aria-hidden="true" />
    </>
  );
  return step.href ? (
    <Link href={step.href} className={cls}>
      {body}
    </Link>
  ) : (
    <button onClick={step.onClick} className={cls}>
      {body}
    </button>
  );
}
