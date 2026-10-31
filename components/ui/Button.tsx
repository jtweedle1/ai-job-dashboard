import { forwardRef } from "react";

// Trailhead buttons (DESIGN.md §8). One primary per screen; secondary for alternatives; quiet for
// low-weight row and toolbar actions; danger only for destructive actions.
export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger" | "danger-solid";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap select-none transition-[background-color,color,border-color,transform] duration-150 ease-out active:scale-[.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-sm",
  md: "h-10 px-5 text-ui",
  lg: "h-12 px-6 text-base",
};

const QUIET_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-sm",
  md: "h-9 px-3 text-ui",
  lg: "h-11 px-4 text-base",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-action text-on-action hover:bg-action-hover",
  secondary: "border border-control text-ink hover:bg-well",
  quiet: "text-action hover:bg-well",
  danger: "text-danger hover:bg-danger-wash",
  "danger-solid": "bg-danger text-on-action hover:opacity-90",
};

export function buttonClasses({
  variant = "secondary",
  size = "md",
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  const sizing = variant === "quiet" || variant === "danger" ? QUIET_SIZES[size] : SIZES[size];
  return `${BASE} ${sizing} ${VARIANTS[variant]} ${className}`;
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  // A Tabler icon name, shown before the label. Only when it adds meaning.
  icon?: string;
  // Keeps the button's width and swaps the label for `loadingLabel` with a small spinner.
  loading?: boolean;
  loadingLabel?: string;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, icon, loading, loadingLabel, className, children, disabled, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...rest}
    >
      {loading ? (
        <>
          <i className="ti ti-loader-2 animate-spin text-[1.05em]" aria-hidden="true" />
          {loadingLabel ?? children}
        </>
      ) : (
        <>
          {icon && <i className={`ti ${icon} text-[1.1em]`} aria-hidden="true" />}
          {children}
        </>
      )}
    </button>
  );
});

export default Button;

// A round icon-only button. `label` is required: it's the button's accessible name.
export const IconButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string; size?: "sm" | "md" }
>(function IconButton({ icon, label, size = "md", className = "", type = "button", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`${
        size === "sm" ? "w-8 h-8 text-base" : "w-9 h-9 text-lg"
      } shrink-0 rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-well hover:text-ink transition-colors duration-100 disabled:opacity-45 disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      <i className={`ti ${icon}`} aria-hidden="true" />
    </button>
  );
});
