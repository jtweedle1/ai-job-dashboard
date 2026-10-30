"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { signOutUser } from "@/lib/auth";
import Sidebar, { Logo } from "./Sidebar";
import SectionTabs from "./SectionTabs";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen app-backdrop flex items-center justify-center">
        <i className="ti ti-loader-2 animate-spin text-gray-400 text-2xl" aria-hidden="true" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen app-backdrop">
      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => {
          setSidebarOpen(false);
          menuButton.current?.focus();
        }}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex md:hidden items-center gap-3 px-4 py-3 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border-b border-white/80 dark:border-white/5 shrink-0">
          <button
            ref={menuButton}
            onClick={() => setSidebarOpen(true)}
            aria-expanded={sidebarOpen}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label="Open menu"
          >
            <i className="ti ti-menu-2 text-xl" aria-hidden="true" />
          </button>
          <div className="flex-1">
            <Logo small />
          </div>
          <button
            onClick={toggleTheme}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"} text-lg`} aria-hidden="true" />
          </button>
        </header>

        {user.isAnonymous && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 glow-gradient text-xs text-gray-700 dark:text-gray-100 shrink-0">
            <i className="ti ti-eye text-sm" aria-hidden="true" />
            <span className="flex-1 min-w-0">
              You&apos;re exploring a demo job search for Riley, a product designer. Click around and change anything.
              AI buttons need an Anthropic key, added in Settings. Recruiters and hiring managers: Jazmin is happy
              to provide a temporary key so you can try every feature. Email{" "}
              <a href="mailto:jazminrtweedle@gmail.com" className="font-medium underline">
                jazminrtweedle@gmail.com
              </a>
              .
            </span>
            <button
              onClick={async () => {
                await signOutUser();
                router.replace("/");
              }}
              className="font-medium hover:underline"
            >
              Leave demo
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <SectionTabs />
          {children}
        </main>
      </div>
    </div>
  );
}
