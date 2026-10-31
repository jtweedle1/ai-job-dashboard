"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getJobs } from "@/lib/jobs";
import { getBackgrounds } from "@/lib/backgrounds";
import { getAnswers } from "@/lib/answerBank";
import { getDebriefs } from "@/lib/debriefs";
import { buildStoryItems, searchStories, STORY_KIND_META, type StoryItem, type StoryKind } from "@/lib/stories";
import StoryTabs from "@/components/StoryTabs";
import PageFrame from "@/components/ui/PageFrame";
import { buttonClasses } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { EmptyState, LoadingBlocks } from "@/components/ui/bits";
import { ContourMap } from "@/components/illustrations";

const KINDS = Object.keys(STORY_KIND_META) as StoryKind[];

export default function StoriesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<StoryKind | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getJobs(user.uid), getBackgrounds(user.uid), getAnswers(user.uid), getDebriefs(user.uid)]).then(
      ([jobs, backgrounds, answers, debriefs]) => {
        const title = (id: string | null) => {
          const j = id ? jobs.find((x) => x.id === id) : null;
          return j ? `${j.title} at ${j.company}` : null;
        };
        setItems(buildStoryItems(backgrounds, answers, debriefs, title));
        setLoading(false);
      }
    );
  }, [user]);

  const counts = useMemo(() => {
    const c: Record<StoryKind, number> = { experience: 0, answer: 0, interview: 0 };
    items.forEach((i) => c[i.kind]++);
    return c;
  }, [items]);
  const filtered = useMemo(() => searchStories(items, search, kind), [items, search, kind]);

  const frame = (children: React.ReactNode) => (
    <PageFrame
      above={<StoryTabs />}
      title="Your library"
      intro="Everything you've told Wayfinder about your work. Letters, application answers and interview prep all draw from it."
    >
      {children}
    </PageFrame>
  );

  if (loading) return frame(<LoadingBlocks rows={3} label="Loading your library" />);

  if (items.length === 0)
    return frame(
      <EmptyState
        art={<ContourMap />}
        title="Your stories live here"
        action={
          <Link href="/background" className={buttonClasses({ variant: "primary" })}>
            Add a past position
          </Link>
        }
      >
        Add a past position and answer a few questions about what you did there. Every letter draws from it.
      </EmptyState>
    );

  return frame(
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1 min-w-[min(100%,16rem)]">
          <i className="ti ti-search absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            aria-label="Search stories"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search, e.g. onboarding, conflict, Figma…"
            className={`${inputClasses} h-10 pl-10 rounded-full`}
          />
        </div>
        <div role="group" aria-label="Show only" className="flex flex-wrap gap-1">
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setKind(kind === k ? null : k)}
              aria-pressed={kind === k}
              className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-full border text-ui font-semibold transition-colors duration-100 ${
                kind === k ? "border-ink bg-ink text-canvas" : "border-control text-ink hover:bg-well"
              }`}
            >
              {STORY_KIND_META[k].label}
              <span className={`tabular-nums font-normal ${kind === k ? "text-canvas" : "text-ink-muted"}`}>{counts[k]}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nothing matches that search" />
      ) : (
        <ul>
          {filtered.map((item) => {
            const open = expandedId === item.id;
            return (
              <li key={item.id} className="py-4 border-b border-rule last:border-b-0">
                <div className="flex items-start justify-between gap-4">
                  <button
                    onClick={() => setExpandedId(open ? null : item.id)}
                    aria-expanded={open}
                    className="flex-1 min-w-0 text-left rounded-stamp outline-offset-4 group"
                  >
                    <span className="block text-meta text-ink-muted truncate">{item.context || STORY_KIND_META[item.kind].label}</span>
                    <span className="block font-semibold text-ink group-hover:text-action transition-colors duration-100">{item.title}</span>
                    <span className={`mt-1 text-ink-soft whitespace-pre-wrap ${open ? "block" : "line-clamp-2"}`}>
                      {item.text || <span className="text-ink-muted">No answer yet</span>}
                    </span>
                  </button>
                  <Link href={item.href} className="hit shrink-0 text-meta font-semibold text-action hover:underline underline-offset-4">
                    Open
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
