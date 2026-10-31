"use client";

import { forwardRef, useState } from "react";
import Link from "next/link";
import QuickActions, { type Act } from "./QuickActions";
import { type NextAction } from "@/lib/next-steps";
import { groupActions } from "@/lib/today";
import type { Job } from "@/types/job";

const VISIBLE = 5;

function ActionRow({ action, job, onAct, now }: { action: NextAction; job: Job; onAct: Act; now: Date }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5 border-t border-rule first:border-t-0">
      <Link
        href={`/applications/${action.jobId}?step=${action.step}`}
        className="group flex-1 basis-full sm:basis-0 sm:min-w-[16rem] min-w-0 rounded-stamp outline-offset-4"
      >
        <span className="block font-semibold text-ink group-hover:text-action transition-colors duration-100">{action.action}</span>
        <span className="mt-0.5 flex items-center gap-x-2 flex-wrap text-meta text-ink-soft">
          <span>
            {action.company} · {action.title}
          </span>
          {action.chip && (
            <span className={`font-semibold ${action.chip.overdue ? "text-caution" : "text-sun-ink"}`}>
              {action.chip.overdue && <i className="ti ti-alert-triangle mr-1" aria-hidden="true" />}
              {action.chip.text}
            </span>
          )}
        </span>
      </Link>
      <QuickActions action={action} job={job} onAct={onAct} now={now} />
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
      <section aria-labelledby="up-next">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <h2 id="up-next" ref={headingRef} tabIndex={-1} className="font-serif text-heading font-semibold text-ink outline-offset-4">
            Up next
          </h2>
          <span className="text-meta text-ink-muted">{actions.length} more</span>
        </div>
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.id}>
              <h3 className="mb-1 text-label font-semibold text-ink-soft">{g.label}</h3>
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
            className="mt-4 text-ui font-semibold text-action hover:underline underline-offset-4"
          >
            {showAll ? "Show fewer" : `Show all ${actions.length}`}
          </button>
        )}
      </section>
    );
  }
);

export default ActionQueue;
