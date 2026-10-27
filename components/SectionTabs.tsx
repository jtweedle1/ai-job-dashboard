"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, sectionFor } from "./navigation";

// The tabs across the top of a section (Today, Jobs, Me). Hidden where a section has only one page.
export default function SectionTabs() {
  const pathname = usePathname();
  const section = sectionFor(pathname);
  if (!section || section.tabs.length < 2) return null;

  return (
    <div className="px-4 md:px-6 pt-5">
      <nav
        className="inline-flex max-w-full overflow-x-auto gap-1 p-1 rounded-full bg-white/60 dark:bg-white/5 border border-white/80 dark:border-white/5 backdrop-blur"
        aria-label={section.label}
      >
        {section.tabs.map((t) => {
          const active = isActive(pathname, t);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-display font-bold transition-all ${
                active
                  ? "bg-white dark:bg-white/15 text-gray-900 dark:text-white shadow-sm shadow-gray-900/5"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
