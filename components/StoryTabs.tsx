"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Everything", href: "/stories" },
  { label: "Experience", href: "/background" },
  { label: "Answers", href: "/answer-bank" },
  { label: "Interview notes", href: "/debrief" },
];

// The Library: your experience, answers and interview notes. A second, quieter row of tabs under the
// section's own, shared by the pages that hold them.
export default function StoryTabs() {
  const pathname = usePathname();
  return (
    <nav className="-ml-3.5 -mr-1 mb-4 overflow-x-auto" aria-label="Library">
      <ul className="flex gap-1 pr-1 min-w-max">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center h-9 px-3.5 rounded-full text-meta font-semibold whitespace-nowrap transition-colors duration-100 ${
                  active ? "bg-well text-ink" : "text-ink-soft hover:text-ink hover:bg-well"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
