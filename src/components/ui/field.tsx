import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-rose">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn("field", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn("field appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn("field min-h-28 resize-y", className)} {...props} />;
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: ComponentProps<"input"> & { label: string; description?: string }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-cream px-3 py-2.5 text-sm transition hover:border-line-strong has-[:checked]:border-pine has-[:checked]:bg-pine-soft/60",
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong accent-pine"
        {...props}
      />
      <span>
        <span className="block text-[13px] font-medium leading-tight text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[11px] leading-snug text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-rose/30 bg-rose-soft px-3 py-2.5 text-[13px] text-rose">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="mt-0.5 shrink-0">
        <path d="M12 4 2.8 20h18.4Z" />
        <path d="M12 10v4M12 17.2v.3" strokeLinecap="round" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  name,
  value,
  options,
}: {
  name: string;
  value: T;
  options: Array<{ value: T; label: string; description?: string }>;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <label
          key={option.value}
          className="relative flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-cream px-3.5 py-3 transition has-[:checked]:border-pine has-[:checked]:bg-pine-soft/60"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            defaultChecked={value === option.value}
            className="mt-1 h-3.5 w-3.5 accent-pine"
          />
          <span>
            <span className="block text-[13px] font-medium text-ink">{option.label}</span>
            {option.description && <span className="mt-0.5 block text-[11px] leading-snug text-muted">{option.description}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
