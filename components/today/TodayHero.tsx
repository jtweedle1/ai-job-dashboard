"use client";

import Link from "next/link";
import QuickActions, { type Act } from "./QuickActions";
import { buttonClasses } from "@/components/ui/Button";
import { Horizon } from "@/components/illustrations";
import { dayPhrase, type ActionKind, type NextAction } from "@/lib/next-steps";
import type { UpcomingInterview } from "@/lib/today";
import type { Job } from "@/types/job";

// What the hero's main button says for each kind of nudge.
const GO: Record<ActionKind, string> = {
  offer: "Weigh it up",
  prep: "Start prep",
  debrief: "Write interview notes",
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

// The one sheet on Today (DESIGN.md §8). It holds whatever matters most right now, with the sun
// coming up in its corner.
function Frame({ label, art = "low", children }: { label: string; art?: "low" | "up"; children: React.ReactNode }) {
  return (
    <section aria-labelledby="today-hero" className="relative overflow-hidden bg-sheet rounded-sheet shadow-sheet p-6 sm:p-8">
      <Horizon sun={art} ground="var(--sheet)" width={176} className="hidden md:block absolute right-8 bottom-6 text-ink-soft" />
      <div className="relative md:pr-48">
        <p className="flex items-center gap-2 text-label font-semibold text-sun-ink">
          <span className="w-2 h-2 rounded-full bg-sun" aria-hidden="true" />
          {label}
        </p>
        {children}
      </div>
    </section>
  );
}

const title = "mt-3 outline-offset-4 font-serif text-title font-semibold text-ink text-balance";

export function NextStepHero({ action, job, onAct, now }: { action: NextAction; job: Job; onAct: Act; now: Date }) {
  return (
    <Frame label="Your next step">
      <h2 id="today-hero" tabIndex={-1} className={title}>{action.action}</h2>
      <p className="mt-2 font-semibold text-ink">
        {action.company} <span className="font-normal text-ink-soft">· {action.title}</span>
      </p>
      <p className="mt-1 text-ink-soft max-w-prose">{action.detail}</p>
      <div className="mt-6 flex items-center gap-2 flex-wrap">
        <Link href={`/applications/${action.jobId}?step=${action.step}`} className={buttonClasses({ variant: "primary", size: "lg" })}>
          {GO[action.kind]}
          <i className="ti ti-arrow-right" aria-hidden="true" />
        </Link>
        <QuickActions action={action} job={job} onAct={onAct} variant="hero" now={now} />
      </div>
    </Frame>
  );
}

export function CaughtUpHero({ next, onAdd, now }: { next?: UpcomingInterview; onAdd: () => void; now: Date }) {
  return (
    <Frame label="All clear" art="up">
      <h2 id="today-hero" tabIndex={-1} className={title}>Nothing needs you today</h2>
      <p className="mt-2 text-ink-soft max-w-prose">
        {next
          ? `Next on the calendar: ${next.company} ${dayPhrase(next.date, now)}. Until then, add another role when one catches your eye.`
          : "Add another role when one catches your eye, or take the afternoon off."}
      </p>
      <button onClick={onAdd} className={buttonClasses({ variant: "secondary", className: "mt-6" })}>
        <i className="ti ti-plus" aria-hidden="true" />
        Add a job
      </button>
    </Frame>
  );
}

export function FirstJobHero({ onAdd }: { onAdd: () => void }) {
  return (
    <Frame label="Start here">
      <h2 id="today-hero" tabIndex={-1} className={title}>Every trail starts with one saved role</h2>
      <p className="mt-2 text-ink-soft max-w-prose">
        Paste a link or a description of a role you&apos;re curious about. Wayfinder fills in the details and walks you
        through it one step at a time.
      </p>
      <button onClick={onAdd} className={buttonClasses({ variant: "primary", size: "lg", className: "mt-6" })}>
        <i className="ti ti-plus" aria-hidden="true" />
        Add a job
      </button>
    </Frame>
  );
}

export function SetupHero({ steps }: { steps: SetupStep[] }) {
  const done = steps.filter((s) => s.done).length;
  return (
    <Frame label={`Getting set up · ${done} of ${steps.length} done`}>
      <h2 id="today-hero" tabIndex={-1} className={title}>Let&apos;s get you set up</h2>
      <p className="mt-2 text-ink-soft max-w-prose">About five minutes, and every step makes your letters sound more like you.</p>
      <ol className="mt-5 -mx-3">
        {steps.map((s, i) => {
          const body = (
            <>
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-meta font-semibold shrink-0 font-serif ${
                  s.done ? "bg-ink-soft text-canvas" : "border-[1.5px] border-control text-ink"
                }`}
              >
                {s.done ? <i className="ti ti-check" aria-hidden="true" /> : i + 1}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block font-semibold ${s.done ? "text-ink-muted" : "text-ink"}`}>
                  {s.label}
                  {s.done && <span className="sr-only"> (done)</span>}
                </span>
                {!s.done && <span className="block text-meta text-ink-soft">{s.detail}</span>}
              </span>
              {!s.done && <i className="ti ti-arrow-right text-ink-soft" aria-hidden="true" />}
            </>
          );
          const cls = "w-full flex items-center gap-3 px-3 py-2.5 rounded-field text-left hover:bg-well transition-colors duration-100";
          return (
            <li key={s.label}>
              {s.done ? (
                <div className="flex items-center gap-3 px-3 py-2.5">{body}</div>
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
