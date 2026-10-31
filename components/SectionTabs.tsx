"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isActive, sectionFor } from "./navigation";

// The tabs across the top of a section (Today, Jobs, Me): plain text, with a short trail stroke under
// the current one. Hidden where a section has only one page. Rendered inside <PageFrame> so the tabs
// line up with the column they control.
export default function SectionTabs() {
  const pathname = usePathname();
  const section = sectionFor(pathname);
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  if (!section || section.tabs.length < 2) return null;

  return (
    <nav className="-mx-1 mb-6 overflow-x-auto" aria-label={section.label}>
      <ul className="flex gap-6 px-1 min-w-max">
        {section.tabs.map((t) => {
          const active = isActive(pathname, t);
          return (
            <li key={t.href}>
              <Link
                ref={active ? activeRef : undefined}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex items-center h-10 text-ui font-semibold whitespace-nowrap transition-colors duration-100 ${
                  active ? "text-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t.label}
                {active && <span className="absolute left-0 right-0 bottom-1 h-0.5 rounded-full bg-ink" aria-hidden="true" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
