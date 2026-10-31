"use client";

import { useEffect, useState } from "react";

interface EditableFieldProps {
  value: string | null;
  onSave: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  // What the field is, for screen readers: "Location" is announced as "Edit Location".
  label?: string;
}

export default function EditableField({
  value,
  onSave,
  placeholder = "Add…",
  multiline = false,
  rows = 5,
  className = "",
  label,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  // A quiet "Saved" after a real change, gone after two seconds (DESIGN.md §10).
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  function commit() {
    onSave(draft);
    setEditing(false);
    if (draft !== (value ?? "")) setSaved(true);
  }

  function cancel() {
    setDraft(value ?? "");
    setEditing(false);
  }

  const inputClass =
    "w-full rounded-field bg-sheet border border-action px-3 py-2 text-base text-ink focus:outline-2 focus:outline-offset-2 focus:outline-action";

  if (editing) {
    return multiline ? (
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Escape" && cancel()}
        rows={rows}
        aria-label={label}
        autoFocus
        className={`${inputClass} resize-none ${className}`}
      />
    ) : (
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        aria-label={label}
        autoFocus
        className={`${inputClass} ${className}`}
      />
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setDraft(value ?? "");
          setEditing(true);
        }}
        className={`w-full text-left px-3 py-2 rounded-field text-base hover:bg-well transition-colors duration-100 group ${className}`}
      >
        {label && <span className="sr-only">Edit {label}: </span>}
        {value ? (
          <span className="text-ink whitespace-pre-wrap">{value}</span>
        ) : (
          <span className="text-ink-muted">{placeholder}</span>
        )}
        <i
          className="ti ti-pencil text-ink-muted text-sm ml-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100 transition-opacity"
          aria-hidden="true"
        />
      </button>
      <span
        role="status"
        className="absolute right-3 top-2.5 text-note font-semibold text-moss pointer-events-none"
      >
        {saved && (
          <span className="animate-[fade-in_160ms_var(--ease-out)]">Saved</span>
        )}
      </span>
    </div>
  );
}
