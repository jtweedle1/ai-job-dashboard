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
      <div className="min-h-screen bg-canvas flex items-center justify-center" role="status">
        <span className="w-4 h-4 rounded-full bg-sun animate-pulse" aria-hidden="true" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-dvh bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-full focus:bg-ink focus:text-canvas focus:font-semibold"
      >
        Skip to content
      </a>
      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => {
          setSidebarOpen(false);
          menuButton.current?.focus();
        }}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Phone top bar */}
        <header className="flex md:hidden items-center gap-1 px-2 h-14 bg-canvas border-b border-rule shrink-0">
          <button
            ref={menuButton}
            onClick={() => setSidebarOpen(true)}
            aria-expanded={sidebarOpen}
            className="w-10 h-10 rounded-full flex items-center justify-center text-ink-soft hover:bg-well hover:text-ink transition-colors duration-100"
            aria-label="Open menu"
          >
            <i className="ti ti-menu-2 text-xl" aria-hidden="true" />
          </button>
          <div className="flex-1 pl-1">
            <Logo small />
          </div>
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center text-ink-soft hover:bg-well hover:text-ink transition-colors duration-100"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"} text-lg`} aria-hidden="true" />
          </button>
        </header>

        {user.isAnonymous && <DemoBanner onLeave={async () => {
          await signOutUser();
          router.replace("/");
        }} />}

        <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
          {/* Migration bridge: pages not yet on <PageFrame> still get their tabs here. Hidden once a
              page renders its own frame; removed when every page has moved over. */}
          <div className="legacy-tabs px-4 sm:px-6 lg:px-10 pt-6">
            <SectionTabs />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

// The demo note. One line on phones, with the rest a tap away; the whole note on wider screens.
function DemoBanner({ onLeave }: { onLeave: () => void }) {
  const [more, setMore] = useState(false);
  return (
    <div className="flex items-start gap-x-3 gap-y-1 px-4 sm:px-6 py-2.5 bg-sun-wash text-meta text-ink shrink-0">
      <span className="flex-1 min-w-0">
        <span className="font-semibold">You&apos;re exploring Riley&apos;s sample job search.</span>{" "}
        <span className={more ? "" : "hidden md:inline"}>
          Click around and change anything. AI buttons need an Anthropic key, added in Settings. Recruiters and hiring
          managers: Jazmin is happy to provide a temporary key so you can try every feature. Email{" "}
          <a href="mailto:jazminrtweedle@gmail.com" className="font-semibold underline underline-offset-2">
            jazminrtweedle@gmail.com
          </a>
          .
        </span>
        <button
          onClick={() => setMore((m) => !m)}
          aria-expanded={more}
          className="md:hidden font-semibold underline underline-offset-2"
        >
          {more ? "Less" : "More"}
        </button>
      </span>
      <button onClick={onLeave} className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline">
        Leave demo
      </button>
    </div>
  );
}
