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

const KINDS = Object.keys(STORY_KIND_META) as StoryKind[];

const USES: { icon: string; title: string; body: string }[] = [
  {
    icon: "ti-mail",
    title: "Cover letters",
    body: "Letters tell your experience stories in your voice, and every claim is traced back to them.",
  },
  {
    icon: "ti-message-2",
    title: "Application questions",
    body: "In Answers, draft a reply to any question (“Why us?”, “Tell me about a conflict”) from the story that fits best.",
  },
  {
    icon: "ti-microphone",
    title: "Interviews",
    body: "Your debrief notes sit next to your prepared answers, so you can see what to tell better next time.",
  },
];

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

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-7 bg-gray-100 dark:bg-gray-800 rounded w-48" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <StoryTabs />

      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Story library</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Everything you&apos;ve told HuntDesk about your work, in one place. Write a story once and use it everywhere.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {USES.map((u) => (
          <div key={u.title} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <i className={`ti ${u.icon} text-emerald-600 text-base`} aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{u.title}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{u.body}</p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <i className="ti ti-books text-gray-400 dark:text-gray-500 text-xl" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No stories yet.{" "}
            <Link href="/background" className="text-emerald-600 hover:underline">
              Add a past position
            </Link>{" "}
            and answer a few questions about what you did there.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-48">
              <i
                className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 text-sm"
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search every story, e.g. onboarding, conflict, Figma…"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800"
              />
            </div>
            {KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(kind === k ? null : k)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  kind === k
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                <i className={`ti ${STORY_KIND_META[k].icon} text-xs`} aria-hidden="true" />
                {STORY_KIND_META[k].label} {counts[k]}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">No stories match your search.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.map((item) => {
                const open = expandedId === item.id;
                return (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <button onClick={() => setExpandedId(open ? null : item.id)} className="flex-1 min-w-0 text-left">
                        <p className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                          <i className={`ti ${STORY_KIND_META[item.kind].icon} text-xs`} aria-hidden="true" />
                          <span className="truncate">{item.context || STORY_KIND_META[item.kind].label}</span>
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{item.title}</p>
                        <p
                          className={`text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap leading-relaxed ${
                            open ? "" : "line-clamp-2"
                          }`}
                        >
                          {item.text || <span className="italic text-gray-400 dark:text-gray-500">No answer yet</span>}
                        </p>
                      </button>
                      <Link
                        href={item.href}
                        className="shrink-0 text-xs text-gray-400 dark:text-gray-500 hover:text-emerald-600 transition-colors"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
