// The app's map: four places, each with its own tabs. Sidebar and section header both read from here.

export interface NavTab {
  label: string;
  href: string;
  // Other routes that light up this tab.
  also?: string[];
}

export interface NavSection {
  label: string;
  hint: string;
  href: string;
  icon: string;
  tabs: NavTab[];
}

export const SECTIONS: NavSection[] = [
  {
    label: "Today",
    hint: "What to do next",
    href: "/dashboard",
    icon: "ti-sun",
    tabs: [
      { label: "Today", href: "/dashboard" },
      { label: "Progress", href: "/analytics" },
      { label: "Weekly review", href: "/weekly-review" },
    ],
  },
  {
    label: "Jobs",
    hint: "Every role, start to finish",
    href: "/applications",
    icon: "ti-briefcase",
    tabs: [
      { label: "Pipeline", href: "/applications", also: ["/cover-letters", "/interview-prep"] },
      { label: "Companies", href: "/companies" },
    ],
  },
  {
    label: "Me",
    hint: "What your letters draw on",
    href: "/resumes",
    icon: "ti-user-circle",
    tabs: [
      { label: "Resume", href: "/resumes" },
      { label: "Stories", href: "/stories", also: ["/background", "/answer-bank", "/debrief"] },
      { label: "Voice", href: "/voice" },
      { label: "Goals", href: "/goals" },
    ],
  },
  {
    label: "Settings",
    hint: "API key and account",
    href: "/settings",
    icon: "ti-settings",
    tabs: [],
  },
];

export function isActive(pathname: string, tab: NavTab): boolean {
  return [tab.href, ...(tab.also ?? [])].some((href) => pathname === href || pathname.startsWith(href + "/"));
}

export function sectionFor(pathname: string): NavSection | undefined {
  return SECTIONS.find((s) => isActive(pathname, s) || s.tabs.some((t) => isActive(pathname, t)));
}
