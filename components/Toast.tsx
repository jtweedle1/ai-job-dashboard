// The small confirmation pill at the bottom of the screen. Announced politely to screen readers.
// An optional action (like Undo) holds the toast open while it's hovered or focused.
export default function Toast({
  message,
  action,
  onHold,
  onRelease,
}: {
  message: string;
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
          className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium pl-4 pr-2 py-2 rounded-full shadow-lg shadow-gray-900/20 whitespace-nowrap"
        >
          <i className="ti ti-circle-check text-primary-300 text-base" aria-hidden="true" />
          <span className={action ? "" : "pr-2"}>{message}</span>
          {action && (
            <button
              onClick={action.onClick}
              className="ml-1 px-3 py-1 rounded-full text-primary-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
