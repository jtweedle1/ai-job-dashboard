"use client";

import { useId } from "react";
import { inputClasses } from "@/components/ui/Field";
import { buttonClasses } from "@/components/ui/Button";

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

// A day picker (the next interview, or a saved role's apply-by day). Saves as soon as a full date is picked.
export default function InterviewDateField({
  value,
  onSave,
  label = "Interview date",
  labelClassName = "text-label font-semibold text-ink-soft",
}: {
  value: Date | null;
  onSave: (date: Date | null) => void;
  label?: string;
  labelClassName?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-x-3 gap-y-2 flex-wrap">
      <label htmlFor={id} className={labelClassName}>
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
        className={`${inputClasses} max-w-[13rem]`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onSave(null)}
          className={buttonClasses({ variant: "quiet", size: "sm" })}
        >
          Clear
        </button>
      )}
    </div>
  );
}
