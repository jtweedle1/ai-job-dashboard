"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutUser } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { SECTIONS, sectionFor } from "./navigation";

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

// The wordmark: a flat sun and "Wayfinder" in Fraunces. The sun is the same one that marks where you
// are on every trail.
export function Logo({ small }: { small?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`${small ? "w-[18px] h-[18px]" : "w-5 h-5"} rounded-full bg-sun`} aria-hidden="true" />
      <span className={`font-serif font-semibold text-ink ${small ? "text-lg" : "text-xl"}`}>Wayfinder</span>
    </span>
  );
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const current = sectionFor(pathname);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // The phone menu behaves like a dialog: focus moves in, Escape closes it, Tab stays inside.
  useEffect(() => {
    if (!mobileOpen) return;
    const drawer = drawerRef.current;
    drawer?.querySelector<HTMLElement>("a, button")?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current?.();
      if (e.key !== "Tab" || !drawer) return;
      const items = drawer.querySelectorAll<HTMLElement>("a, button");
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const name = user?.isAnonymous ? "Demo visitor" : user?.displayName ?? user?.email ?? "Account";

  const sidebar = (
    <aside className="w-[232px] h-full flex flex-col bg-canvas border-r border-rule">
      <div className="px-6 pt-7 pb-9">
        <Logo />
      </div>

      <nav className="flex-1 overflow-y-auto px-3" aria-label="Main">
        <ul className="space-y-0.5">
          {SECTIONS.map((s) => {
            const active = current?.href === s.href;
            return (
              <li key={s.href}>
                <Link
                  href={s.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 h-10 pl-3 pr-4 rounded-full text-base font-semibold transition-colors duration-100 ${
                    active ? "text-ink" : "text-ink-soft hover:bg-well hover:text-ink"
                  }`}
                >
                  {/* The sun dot: you are here. */}
                  <span className={`w-2 h-2 rounded-full shrink-0 ${active ? "bg-sun" : ""}`} aria-hidden="true" />
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mx-3 mb-4 pt-3 border-t border-rule flex items-center gap-1 pl-3">
        <span className="text-meta text-ink-soft flex-1 truncate" title={name}>
          {name}
        </span>
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:bg-well hover:text-ink transition-colors duration-100"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"} text-lg`} aria-hidden="true" />
        </button>
        <button
          onClick={() => signOutUser()}
          className="w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:bg-well hover:text-ink transition-colors duration-100"
          aria-label="Sign out"
          title="Sign out"
        >
          <i className="ti ti-logout text-lg" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block h-full">{sidebar}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div ref={drawerRef} role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-[rgb(43_38_69/0.4)] dark:bg-black/60 animate-[fade-in_240ms_var(--ease-out)]"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative z-50 h-full shadow-overlay animate-[pop-in_240ms_var(--ease-out)]">{sidebar}</div>
        </div>
      )}
    </>
  );
}
