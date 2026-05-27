"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutUser } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

const trackingNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "ti-layout-dashboard" },
  { label: "Applications", href: "/applications", icon: "ti-file-text" },
  { label: "Companies", href: "/companies", icon: "ti-building" },
];

const aiNav: NavItem[] = [
  { label: "Cover Letters", href: "/cover-letters", icon: "ti-mail" },
  { label: "Interview Prep", href: "/interview-prep", icon: "ti-microphone" },
  { label: "Answer Bank", href: "/answer-bank", icon: "ti-bookmarks" },
  { label: "Debrief", href: "/debrief", icon: "ti-clipboard-list" },
];

const insightsNav: NavItem[] = [
  { label: "Analytics", href: "/analytics", icon: "ti-chart-bar" },
  { label: "Weekly Review", href: "/weekly-review", icon: "ti-calendar-week" },
];

const bottomNav: NavItem[] = [
  { label: "Resumes", href: "/resumes", icon: "ti-file-cv" },
  { label: "Settings", href: "/settings", icon: "ti-settings" },
];

function NavGroup({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="px-2 mb-4">
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest px-2 mb-1">
        {label}
      </p>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors mb-0.5 ${
              active
                ? "bg-emerald-50 text-emerald-700 font-medium"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            }`}
          >
            <i
              className={`ti ${item.icon} text-base ${active ? "text-emerald-600" : ""}`}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const sidebar = (
    <aside className="w-52 min-w-[208px] h-screen flex flex-col bg-white border-r border-gray-100">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-100">
        <div className="w-7 h-7 rounded-md bg-gray-900 flex items-center justify-center">
          <i className="ti ti-briefcase text-emerald-400 text-sm" aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold text-gray-900 tracking-tight">
          HuntDesk
        </span>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3">
        <NavGroup label="Tracking" items={trackingNav} pathname={pathname} onNavigate={onClose} />
        <NavGroup label="AI Tools" items={aiNav} pathname={pathname} onNavigate={onClose} />
        <NavGroup label="Insights" items={insightsNav} pathname={pathname} onNavigate={onClose} />
      </nav>

      {/* Bottom links */}
      <div className="border-t border-gray-100 px-2 py-2">
        {bottomNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors mb-0.5 ${
                active
                  ? "bg-emerald-50 text-emerald-700 font-medium"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              }`}
            >
              <i className={`ti ${item.icon} text-base`} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}

        {/* User row */}
        <div className="flex items-center gap-2 px-2 py-2 mt-1">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-semibold text-emerald-700">
            {initials}
          </div>
          <span className="text-xs text-gray-500 flex-1 truncate">
            {user?.displayName ?? user?.email ?? "Account"}
          </span>
          <button
            onClick={() => signOutUser()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Sign out"
          >
            <i className="ti ti-logout text-sm" aria-hidden="true" />
          </button>
        </div>
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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative z-50">{sidebar}</div>
        </div>
      )}
    </>
  );
}
