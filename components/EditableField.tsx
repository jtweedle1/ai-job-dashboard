"use client";

import { useState } from "react";

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
  placeholder = "—",
  multiline = false,
  rows = 5,
  className = "",
  label,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  function commit() {
    onSave(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(value ?? "");
    setEditing(false);
  }

  const inputClass =
    "w-full border border-primary-300 dark:border-primary-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800";

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
    <button
      onClick={() => {
        setDraft(value ?? "");
        setEditing(true);
      }}
      className={`w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group ${className}`}
    >
      {label && <span className="sr-only">Edit {label}: </span>}
      {value ? (
        <span className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{value}</span>
      ) : (
        <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
      )}
      <i
        className="ti ti-pencil text-gray-400 dark:text-gray-500 text-xs ml-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100 transition-opacity"
        aria-hidden="true"
      />
    </button>
  );
}
