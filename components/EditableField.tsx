"use client";

import { useState } from "react";

interface EditableFieldProps {
  value: string | null;
  onSave: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
}

export default function EditableField({
  value,
  onSave,
  placeholder = "—",
  multiline = false,
  rows = 5,
  className = "",
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
    "w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white";

  if (editing) {
    return multiline ? (
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Escape" && cancel()}
        rows={rows}
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
      className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors group ${className}`}
    >
      {value ? (
        <span className="text-gray-900 whitespace-pre-wrap">{value}</span>
      ) : (
        <span className="text-gray-400">{placeholder}</span>
      )}
      <i
        className="ti ti-pencil text-gray-300 group-hover:text-gray-400 text-xs ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-hidden="true"
      />
    </button>
  );
}
