import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "soft"
  | "ghost"
  | "gold-ghost"
  | "pine-ghost"
  | "clay";
type Size = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<Variant, string> = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary",
  outline: "btn btn-outline",
  soft: "btn btn-soft",
  ghost: "btn btn-ghost",
  "gold-ghost": "btn btn-gold-ghost",
  "pine-ghost": "btn btn-pine-ghost",
  clay: "btn btn-clay",
};

const SIZES: Record<Size, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
  xl: "btn-xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className = "") {
  return cn(VARIANTS[variant], SIZES[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  isLoading,
  leftIcon,
  rightIcon,
  fullWidth,
  ...props
}: ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <button
      className={buttonClass(variant, size, cn("inline-flex flex-row items-center justify-center gap-2", fullWidth && "w-full", className))}
      disabled={props.disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex flex-row items-center justify-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>{children}</span>
        </span>
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0 items-center justify-center">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="inline-flex shrink-0 items-center justify-center">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  leftIcon,
  rightIcon,
  fullWidth,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <Link
      href={href}
      className={buttonClass(variant, size, cn("inline-flex flex-row items-center justify-center gap-2", fullWidth && "w-full", className))}
      {...props}
    >
      {leftIcon && <span className="inline-flex shrink-0 items-center justify-center">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="inline-flex shrink-0 items-center justify-center">{rightIcon}</span>}
    </Link>
  );
}

export function IconButton({
  label,
  variant = "ghost",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<"button"> & {
  label: string;
  variant?: Exclude<Variant, "clay">;
  size?: Size;
}) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-10 w-10",
    xl: "h-12 w-12",
  };

  const variantClasses: Record<Exclude<Variant, "clay">, string> = {
    ghost: "bg-transparent text-ink-soft hover:bg-sand hover:text-ink border-transparent",
    soft: "bg-sand text-ink-soft hover:bg-sand-deep border border-line",
    "gold-ghost": "bg-transparent text-gold-deep hover:bg-gold-soft hover:text-gold-deep border border-gold/20",
    "pine-ghost": "bg-transparent text-pine hover:bg-pine-soft hover:text-pine-deep border border-pine/20",
    outline: "bg-white text-ink border-line-strong hover:border-gold hover:text-gold-deep hover:bg-gold-soft",
    primary: "bg-gold-gradient text-white hover:opacity-90 shadow-gold",
    secondary: "bg-pine-gradient text-white hover:opacity-90 shadow-pine",
  };

  return (
    <button
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonGroup({ children, className, vertical }: { children: ReactNode; className?: string; vertical?: boolean }) {
  return (
    <div
      className={cn(
        "inline-flex",
        vertical ? "flex-col" : "flex-row",
        "rounded-xl border border-line-strong overflow-hidden",
        className,
      )}
      role="group"
    >
      {children}
    </div>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
  variant = "default",
}: {
  options: Array<{ value: string; label: string; icon?: ReactNode }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  variant?: "default" | "pill";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 bg-cream rounded-xl p-1 border border-line",
        variant === "pill" && "bg-white shadow-sm",
        className,
      )}
      role="radiogroup"
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
            value === option.value
              ? variant === "pill"
                ? "bg-white text-gold-deep shadow-sm"
                : "bg-gold-gradient text-white shadow-gold"
              : "text-ink-soft hover:text-ink hover:bg-white",
          )}
        >
          {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}