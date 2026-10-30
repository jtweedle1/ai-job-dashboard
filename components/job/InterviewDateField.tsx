"use client";

import { useId } from "react";

// <input type="date"> speaks yyyy-mm-dd in local time; keep it that way in both directions.
export function toInputDate(d: Date | null): string {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseInputDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// The day of the next interview. Saves as soon as a full date is picked.
export default function InterviewDateField({
  value,
  onSave,
  label = "Interview date",
}: {
  value: Date | null;
  onSave: (date: Date | null) => void;
  label?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label htmlFor={id} className="text-xs text-gray-500 dark:text-gray-400">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={toInputDate(value)}
        onChange={(e) => {
          const next = parseInputDate(e.target.value);
          if (next || e.target.value === "") onSave(next);
        }}
        className="border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5 text-sm bg-white/80 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      {value && (
        <button
          type="button"
          onClick={() => onSave(null)}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
