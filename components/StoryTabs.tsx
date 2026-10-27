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
    <nav className="flex gap-2 overflow-x-auto mb-6" aria-label="Story library">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-sm border transition-colors ${
              active
                ? "border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-medium"
                : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/70 dark:hover:bg-white/5"
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
