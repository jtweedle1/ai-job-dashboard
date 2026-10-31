"use client";

import { useEffect, useId, useRef } from "react";
import { IconButton } from "./Button";

// A native modal dialog (DESIGN.md §8): the page behind goes inert, Tab stays inside, Escape and the
// close button both ask to close, and focus returns to whatever opened it. On phones it rises from the
// bottom as a sheet. The caller decides whether closing needs a confirmation first.
export default function Dialog({
  title,
  description,
  onRequestClose,
  children,
  footer,
  wide = false,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  onRequestClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => opener?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onRequestClose();
      }}
      onClick={(e) => {
        // A click on the dimmed backdrop lands on the dialog element itself.
        if (e.target === ref.current) onRequestClose();
      }}
      className={`p-0 bg-transparent overflow-visible w-full max-w-none mx-0 mb-0 mt-auto sm:m-auto sm:w-[calc(100%-2rem)] ${
        wide ? "sm:max-w-[45rem]" : "sm:max-w-[35rem]"
      } backdrop:bg-[rgb(43_38_69/0.4)] dark:backdrop:bg-black/60 backdrop:animate-[fade-in_240ms_var(--ease-out)]`}
    >
      <div className="bg-sheet text-ink rounded-t-dialog sm:rounded-dialog shadow-overlay flex flex-col max-h-[92dvh] sm:max-h-[90dvh] animate-[sheet-up_240ms_var(--ease-out)]">
        <div className="flex items-start gap-4 px-5 sm:px-8 pt-6 sm:pt-7 pb-4 shrink-0">
          <div className="flex-1 min-w-0">
            <h2 id={titleId} className="font-serif text-heading font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-ink-soft">
                {description}
              </p>
            )}
          </div>
          <IconButton icon="ti-x" label="Close" onClick={onRequestClose} className="-mr-2 -mt-1" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 pb-6">{children}</div>
        {footer && (
          <div className="shrink-0 px-5 sm:px-8 py-4 border-t border-rule flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 max-sm:[&>button]:w-full">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
