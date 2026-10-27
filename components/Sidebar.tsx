"use client";

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

export function Logo({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${small ? "w-6 h-6" : "w-8 h-8"} rounded-full sun-orb shadow-sm shadow-peach-400/40`} aria-hidden="true" />
      <span className={`${small ? "text-base" : "text-lg"} font-display font-extrabold tracking-tight text-gray-900 dark:text-gray-50`}>
        HuntDesk
      </span>
    </div>
  );
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const current = sectionFor(pathname);

  const initials = user?.isAnonymous
    ? "D"
    : user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const sidebar = (
    <aside className="w-64 min-w-[256px] h-screen flex flex-col bg-white/55 dark:bg-gray-900/55 backdrop-blur-xl border-r border-white/80 dark:border-white/5">
      <div className="px-6 pt-6 pb-8">
        <Logo />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1" aria-label="Main">
        {SECTIONS.map((s) => {
          const active = current?.href === s.href;
          return (
            <Link
              key={s.href}
              href={s.href}
              onClick={onClose}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all ${
                active
                  ? "bg-white dark:bg-white/10 shadow-sm shadow-gray-900/5"
                  : "hover:bg-white/60 dark:hover:bg-white/5"
              }`}
            >
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  active ? "glow-gradient text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <i className={`ti ${s.icon} text-lg`} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span
                  className={`block font-display font-bold text-[15px] ${
                    active ? "text-gray-900 dark:text-gray-50" : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {s.label}
                </span>
                <span className="block text-xs text-gray-400 dark:text-gray-500 truncate">{s.hint}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-white/60 dark:bg-white/5">
        <div className="w-8 h-8 rounded-full glow-gradient flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-100">
          {initials}
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 truncate">
          {user?.isAnonymous ? "Demo visitor" : user?.displayName ?? user?.email ?? "Account"}
        </span>
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"} text-base`} aria-hidden="true" />
        </button>
        <button
          onClick={() => signOutUser()}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          aria-label="Sign out"
        >
          <i className="ti ti-logout text-base" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block">{sidebar}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative z-50 app-backdrop">{sidebar}</div>
        </div>
      )}
    </>
  );
}
