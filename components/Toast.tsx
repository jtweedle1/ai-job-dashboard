// The small confirmation at the bottom of the screen: ink on paper, for things worth confirming or undoing. Announced politely to screen readers.
// An optional action (like Undo) holds the toast open while it's hovered or focused.
export default function Toast({
  message,
  action,
  onHold,
  onRelease,
  tone = "done",
}: {
  message: string;
  tone?: "done" | "error";
  action?: { label: string; onClick: () => void };
  onHold?: () => void;
  onRelease?: () => void;
}) {
  return (
    <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      {message && (
        <div
          onMouseEnter={onHold}
          onMouseLeave={onRelease}
          onFocus={onHold}
          onBlur={onRelease}
          className="flex items-center gap-2.5 bg-ink text-canvas font-medium pl-4 pr-2 min-h-12 py-2 rounded-field shadow-overlay w-max max-w-[calc(100vw-2rem)] animate-[pop-in_240ms_var(--ease-out)]"
        >
          <i
            className={`ti ${tone === "error" ? "ti-alert-circle text-caution-wash" : "ti-check text-sun"} text-lg shrink-0`}
            aria-hidden="true"
          />
          <span className={action ? "" : "pr-2"}>{message}</span>
          {action && (
            <button
              onClick={action.onClick}
              className="ml-1 h-9 px-3.5 rounded-full font-semibold underline underline-offset-2 hover:bg-canvas/10 transition-colors duration-100"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
