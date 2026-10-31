"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

// A select-only combobox (ARIA Authoring Practices): the trigger keeps focus and points at the active
// option with aria-activedescendant. Arrows move, Enter or Space picks, Escape closes, typing jumps.
// onChange fires once per real change, never while arrowing through the list.
export default function Select<T extends string>({
  id,
  value,
  options,
  onChange,
  ariaLabel,
  prefix,
  look = "field",
  disabled,
  className = "",
}: {
  id?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  // Needed when there's no <label htmlFor={id}>.
  ariaLabel?: string;
  // Shown before the value on the trigger, like "Sort:".
  prefix?: string;
  // "field" looks like an input (forms); "pill" looks like a secondary button (toolbars).
  look?: "field" | "pill";
  disabled?: boolean;
  className?: string;
}) {
  const autoId = useId();
  const triggerId = id ?? `select-${autoId}`;
  const listId = `${triggerId}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function openAt(index: number) {
    setActive(index);
    setOpen(true);
  }

  function pick(index: number) {
    setOpen(false);
    const next = options[index];
    if (next && next.value !== value) onChange(next.value);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openAt(selectedIndex);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        return;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        return;
      case "Home":
        e.preventDefault();
        setActive(0);
        return;
      case "End":
        e.preventDefault();
        setActive(last);
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        pick(active);
        return;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        return;
      case "Tab":
        pick(active);
        return;
    }
    if (e.key.length === 1) {
      const now = Date.now();
      typed.current.text = now - typed.current.at > 700 ? e.key : typed.current.text + e.key;
      typed.current.at = now;
      const match = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text.toLowerCase()));
      if (match >= 0) setActive(match);
    }
  }

  const trigger =
    look === "pill"
      ? "h-10 pl-4 pr-3 rounded-full border border-control text-ui font-semibold text-ink hover:bg-well"
      : "w-full h-11 pl-3.5 pr-3 rounded-field border border-control bg-sheet text-base text-ink";

  return (
    <div ref={wrap} className={`relative ${look === "field" ? "w-full" : "inline-block"} ${className}`}>
      <button
        type="button"
        id={triggerId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex))}
        onKeyDown={onKeyDown}
        onBlur={(e) => {
          if (!wrap.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        className={`${trigger} inline-flex items-center gap-2 text-left transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:opacity-45 disabled:cursor-not-allowed`}
      >
        <span className="flex-1 min-w-0 truncate">
          {prefix && <span className="text-ink-soft font-normal">{prefix} </span>}
          {selected?.label}
        </span>
        <i
          className={`ti ti-chevron-down text-ink-soft transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      <ul
        ref={list}
        id={listId}
        role="listbox"
        aria-labelledby={ariaLabel ? undefined : triggerId}
        aria-label={ariaLabel}
        tabIndex={-1}
        hidden={!open}
        className="absolute z-30 left-0 mt-1.5 min-w-full w-max max-w-[min(22rem,calc(100vw-2rem))] max-h-72 overflow-auto p-1.5 rounded-field bg-raised shadow-overlay animate-[pop-in_160ms_var(--ease-out)]"
      >
        {options.map((o, i) => {
          const isSelected = o.value === value;
          return (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              data-index={i}
              role="option"
              aria-selected={isSelected}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(i)}
              className={`flex items-center gap-2 min-h-10 px-3 rounded-stamp text-base cursor-pointer ${
                isSelected ? "bg-action-wash text-ink" : i === active ? "bg-well text-ink" : "text-ink"
              } ${i === active && isSelected ? "outline-1 outline-control" : ""}`}
            >
              <span className="flex-1">{o.label}</span>
              {isSelected && <i className="ti ti-check text-action" aria-hidden="true" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
