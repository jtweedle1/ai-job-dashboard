import SectionTabs from "../SectionTabs";

// Every signed-in page sits in this frame (DESIGN.md §5): the section tabs, one page header, and a
// column of one of two widths. "read" is for pages you read and write in; "wide" for overviews.
export default function PageFrame({
  width = "read",
  title,
  intro,
  above,
  action,
  children,
}: {
  width?: "read" | "wide";
  // Omit for pages that draw their own header (Today's greeting).
  title?: React.ReactNode;
  // One line of context under the title.
  intro?: React.ReactNode;
  // Small text above the title, like a back link or the date.
  above?: React.ReactNode;
  // At most one primary action.
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="page-frame px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-20">
      <div className={`mx-auto ${width === "wide" ? "max-w-[65rem]" : "max-w-[45rem]"}`}>
        <SectionTabs />
        {title && (
          <header className="flex items-end gap-x-6 gap-y-4 flex-wrap mb-8 sm:mb-10 pt-2">
            <div className="flex-1 min-w-[min(100%,16rem)]">
              {above && <div className="mb-2">{above}</div>}
              <h1 className="font-serif text-title font-semibold text-ink text-balance">{title}</h1>
              {intro && <p className="mt-2 text-ink-soft text-pretty">{intro}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
