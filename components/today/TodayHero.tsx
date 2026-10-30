"use client";

import Link from "next/link";
import QuickActions, { type Act } from "./QuickActions";
import { dayPhrase, type ActionKind, type NextAction } from "@/lib/next-steps";
import type { UpcomingInterview } from "@/lib/today";
import type { Job } from "@/types/job";

// What the hero's main button says for each kind of nudge.
const GO: Record<ActionKind, string> = {
  offer: "Weigh it up",
  prep: "Start prep",
  debrief: "Write a debrief",
  send: "Open your letter",
  letter: "Write the letter",
  fit: "Check the fit",
  follow_up: "Open the job",
};

export interface SetupStep {
  done: boolean;
  label: string;
  detail: string;
  href?: string;
  onClick?: () => void;
}

const soft =
  "inline-flex items-center gap-1.5 bg-white/90 dark:bg-white/15 text-gray-900 dark:text-white text-sm font-medium px-5 min-h-10 pointer-coarse:min-h-11 rounded-full shadow-sm hover:bg-white dark:hover:bg-white/25 transition-colors";

// The one glowing panel on Today. It holds whatever matters most right now.
function Frame({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby="today-hero" className="relative overflow-hidden rounded-4xl glow-gradient px-6 py-7 sm:px-8">
      <div className="absolute -right-10 -top-12 w-44 h-44 rounded-full sun-orb opacity-70 blur-[2px]" aria-hidden="true" />
      <div className="relative max-w-xl">
        <p className="font-display font-bold text-xs uppercase tracking-[0.08em] text-gray-700 dark:text-gray-200">{eyebrow}</p>
        {children}
      </div>
    </section>
  );
}

const title = "mt-1 outline-offset-4 font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-gray-900 dark:text-white";

export function NextStepHero({ action, job, onAct, now }: { action: NextAction; job: Job; onAct: Act; now: Date }) {
  return (
    <Frame eyebrow="Your next step">
      <h1 id="today-hero" tabIndex={-1} className={title}>{action.action}</h1>
      <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-100">
        {action.company} · {action.title}
      </p>
      <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{action.detail}</p>
      <div className="mt-5 flex items-center gap-2 flex-wrap">
        <Link href={`/applications/${action.jobId}?step=${action.step}`} className={soft}>
          {GO[action.kind]}
          <i className="ti ti-arrow-right text-sm" aria-hidden="true" />
        </Link>
        <QuickActions action={action} job={job} onAct={onAct} variant="hero" now={now} />
      </div>
    </Frame>
  );
}

export function CaughtUpHero({ next, onAdd, now }: { next?: UpcomingInterview; onAdd: () => void; now: Date }) {
  return (
    <Frame eyebrow="All caught up">
      <h1 id="today-hero" tabIndex={-1} className={title}>Nothing is waiting on you</h1>
      <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
        {next
          ? `Next on the calendar: ${next.company} ${dayPhrase(next.date, now)}. Until then, add another role when one catches your eye.`
          : "Add another role when one catches your eye, or take the afternoon off."}
      </p>
      <button onClick={onAdd} className={`${soft} mt-5`}>
        <i className="ti ti-plus text-sm" aria-hidden="true" />
        Add a job
      </button>
    </Frame>
  );
}

export function FirstJobHero({ onAdd }: { onAdd: () => void }) {
  return (
    <Frame eyebrow="Start here">
      <h1 id="today-hero" tabIndex={-1} className={title}>Add the first role you&apos;re curious about</h1>
      <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
        Paste a link or a description. Wayfinder fills in the details and walks you through it one step at a time.
      </p>
      <button onClick={onAdd} className={`${soft} mt-5`}>
        <i className="ti ti-plus text-sm" aria-hidden="true" />
        Add a job
      </button>
    </Frame>
  );
}

export function SetupHero({ steps }: { steps: SetupStep[] }) {
  const done = steps.filter((s) => s.done).length;
  return (
    <Frame eyebrow={`Getting set up · ${done} of ${steps.length} done`}>
      <h1 id="today-hero" tabIndex={-1} className={title}>Let&apos;s get you set up</h1>
      <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">About five minutes, and every step makes your letters sound more like you.</p>
      <ol className="mt-4 space-y-1">
        {steps.map((s, i) => {
          const body = (
            <>
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  s.done ? "bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300" : "bg-white/80 dark:bg-white/15 text-gray-800 dark:text-gray-100"
                }`}
              >
                {s.done ? <i className="ti ti-check" aria-hidden="true" /> : i + 1}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block text-sm font-medium ${s.done ? "text-gray-600 dark:text-gray-300 line-through" : "text-gray-900 dark:text-white"}`}>
                  {s.label}
                  {s.done && <span className="sr-only"> (done)</span>}
                </span>
                {!s.done && <span className="block text-xs text-gray-700 dark:text-gray-200">{s.detail}</span>}
              </span>
              {!s.done && <i className="ti ti-arrow-right text-gray-700 dark:text-gray-200" aria-hidden="true" />}
            </>
          );
          const cls = "w-full flex items-center gap-3 px-2 py-2 rounded-2xl text-left hover:bg-white/50 dark:hover:bg-white/10 transition-colors";
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
    </Frame>
  );
}
