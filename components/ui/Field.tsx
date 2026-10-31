import { forwardRef } from "react";

// Inputs and textareas (DESIGN.md §8): paper fill, a control-colored border that passes 3:1, and a
// visible label above. Placeholders are examples, never the label.

const CONTROL =
  "w-full rounded-field bg-sheet border border-control text-base text-ink placeholder:text-ink-muted transition-colors duration-100 focus:outline-2 focus:outline-offset-2 focus:outline-action focus:border-action disabled:opacity-60 disabled:cursor-not-allowed aria-[invalid=true]:border-danger";

export const inputClasses = `${CONTROL} h-11 px-3.5`;
export const textareaClasses = `${CONTROL} px-3.5 py-2.5 leading-relaxed resize-y min-h-[5.5rem]`;

export function Label({
  htmlFor,
  children,
  optional,
  className = "",
}: {
  htmlFor?: string;
  children: React.ReactNode;
  optional?: boolean;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={`block text-label font-semibold text-ink mb-2 ${className}`}>
      {children}
      {optional && <span className="font-normal text-ink-muted"> (optional)</span>}
    </label>
  );
}

export function HelpText({ id, children, error }: { id?: string; children: React.ReactNode; error?: boolean }) {
  return (
    <p id={id} className={`mt-1.5 text-meta flex gap-1.5 ${error ? "text-danger" : "text-ink-muted"}`}>
      {error && <i className="ti ti-alert-circle mt-px" aria-hidden="true" />}
      <span>{children}</span>
    </p>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = "", ...rest },
  ref
) {
  return <input ref={ref} className={`${inputClasses} ${className}`} {...rest} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className = "", ...rest }, ref) {
    return <textarea ref={ref} className={`${textareaClasses} ${className}`} {...rest} />;
  }
);

// Label, control and help text wired together. Pass the control as children with the same id.
export function Field({
  id,
  label,
  help,
  error,
  optional,
  children,
  className = "",
}: {
  id: string;
  label: React.ReactNode;
  help?: React.ReactNode;
  error?: React.ReactNode;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      {children}
      {error ? (
        <HelpText id={`${id}-error`} error>
          {error}
        </HelpText>
      ) : help ? (
        <HelpText id={`${id}-help`}>{help}</HelpText>
      ) : null}
    </div>
  );
}
