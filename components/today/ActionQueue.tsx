"use client";

import { forwardRef, useState } from "react";
import Link from "next/link";
import QuickActions, { type Act } from "./QuickActions";
import { JOB_STEPS, type NextAction } from "@/lib/next-steps";
import { groupActions } from "@/lib/today";
import type { Job } from "@/types/job";

const VISIBLE = 5;

function ActionRow({ action, job, onAct, now }: { action: NextAction; job: Job; onAct: Act; now: Date }) {
  const step = JOB_STEPS.find((s) => s.id === action.step)!;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2 py-2 rounded-2xl hover:bg-white/70 dark:hover:bg-white/5 transition-colors">
      <Link href={`/applications/${action.jobId}?step=${action.step}`} className="group flex items-center gap-3 basis-full sm:basis-0 sm:min-w-[14rem] flex-1 min-w-0 rounded-2xl">
        <span className="w-9 h-9 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
          <i className={`ti ${step.icon} text-base text-gray-500 dark:text-gray-400`} aria-hidden="true" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-gray-900 dark:text-gray-50">{action.action}</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
            {action.company} · {action.title}
          </span>
        </span>
        {action.chip && (
          <span
            className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
              action.chip.overdue
                ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300"
            }`}
          >
            {action.chip.text}
          </span>
        )}
      </Link>
      <div className="pl-12 sm:pl-0">
        <QuickActions action={action} job={job} onAct={onAct} now={now} />
      </div>
    </li>
  );
}

// Everything after the hero's top step, grouped by how soon it needs you.
const ActionQueue = forwardRef<HTMLHeadingElement, { actions: NextAction[]; jobs: Map<string, Job>; onAct: Act; now: Date }>(
  function ActionQueue({ actions, jobs, onAct, now }, headingRef) {
    const [showAll, setShowAll] = useState(false);
    const shown = showAll ? actions : actions.slice(0, VISIBLE);
    const groups = groupActions(shown);

    return (
      <section aria-labelledby="up-next" className="surface p-5">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <h2 id="up-next" ref={headingRef} tabIndex={-1} className="section-label">
            Up next
          </h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">{actions.length} more</span>
        </div>
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id}>
              <h3 className="px-2 mb-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">{g.label}</h3>
              <ul>
                {g.actions.map((a) => {
                  const job = jobs.get(a.jobId);
                  return job ? <ActionRow key={a.jobId} action={a} job={job} onAct={onAct} now={now} /> : null;
                })}
              </ul>
            </div>
          ))}
        </div>
        {actions.length > VISIBLE && (
          <button
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="mt-2 ml-2 text-xs font-medium text-primary-700 dark:text-primary-300 hover:underline"
          >
            {showAll ? "Show fewer" : `Show all ${actions.length}`}
          </button>
        )}
      </section>
    );
  }
);

export default ActionQueue;
