"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "All stories", href: "/stories", icon: "ti-books" },
  { label: "Experience", href: "/background", icon: "ti-briefcase" },
  { label: "Answers", href: "/answer-bank", icon: "ti-bookmarks" },
  { label: "Interview notes", href: "/debrief", icon: "ti-clipboard-list" },
];

// One library, three kinds of story. Shared header for the pages that hold them.
export default function StoryTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto mb-6 border-b border-gray-100 dark:border-gray-800" aria-label="Story library">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm -mb-px border-b-2 transition-colors ${
              active
                ? "border-emerald-500 text-emerald-700 dark:text-emerald-400 font-medium"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <i className={`ti ${t.icon} text-sm`} aria-hidden="true" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
