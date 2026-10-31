"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface MenuItem {
  label: string;
  icon?: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

// The "More" menu (ARIA menu button pattern): secondary and destructive actions live here, not next
// to the title. Arrows move between items, Escape closes and returns focus to the button.
export default function Menu({
  label = "More actions",
  items,
  align = "end",
  trigger = "icon",
}: {
  label?: string;
  items: MenuItem[];
  align?: "start" | "end";
  // "icon" is a round "…" button; "text" shows the label as a quiet pill.
  trigger?: "icon" | "text";
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    itemRefs.current.find((el) => el && !el.disabled)?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function close(focusButton = true) {
    setOpen(false);
    if (focusButton) button.current?.focus();
  }

  function onMenuKey(e: React.KeyboardEvent) {
    const els = itemRefs.current.filter((el): el is HTMLButtonElement => !!el && !el.disabled);
    const at = els.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      els[(at + 1) % els.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      els[(at - 1 + els.length) % els.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      els[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      els[els.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  }

  return (
    <div ref={wrap} className="relative inline-block">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label={trigger === "icon" ? label : undefined}
        title={trigger === "icon" ? label : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={
          trigger === "icon"
            ? "w-9 h-9 rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-well hover:text-ink transition-colors duration-100"
            : "h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-ui font-semibold text-action hover:bg-well transition-colors duration-100"
        }
      >
        {trigger === "icon" ? (
          <i className="ti ti-dots text-lg" aria-hidden="true" />
        ) : (
          <>
            {label}
            <i className="ti ti-chevron-down text-sm" aria-hidden="true" />
          </>
        )}
      </button>
      {open && (
        <div
          id={`${id}-menu`}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={`absolute z-30 mt-1.5 min-w-48 p-1.5 rounded-field bg-raised shadow-overlay animate-[pop-in_160ms_var(--ease-out)] ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item, i) => (
            <button
              key={item.label}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              onClick={() => {
                close();
                item.onSelect();
              }}
              className={`w-full flex items-center gap-2.5 min-h-10 px-3 rounded-stamp text-base text-left whitespace-nowrap hover:bg-well focus:bg-well focus:outline-none disabled:opacity-45 ${
                item.danger ? "text-danger" : "text-ink"
              }`}
            >
              {item.icon && (
                <i className={`ti ${item.icon} ${item.danger ? "" : "text-ink-soft"}`} aria-hidden="true" />
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
