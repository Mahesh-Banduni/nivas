import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
  children,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: IconName;
  trend?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow">{label}</span>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sand/70 text-pine">
            <Icon name={icon} size={15} />
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="display text-[26px] leading-none text-ink">{value}</span>
        {trend}
      </div>
      {hint && <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p>}
      {children}
    </div>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  className,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-cream/60 px-6 py-12 text-center", className)}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sand text-pine">
        <Icon name={icon} size={20} />
      </span>
      <h3 className="mt-3 font-display text-lg text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="display text-[26px] text-ink sm:text-[30px]">{title}</h2>
        {description && <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("surface overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h3 className="font-display text-[17px] text-ink">{title}</h3>}
          {action}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </div>
  );
}

export function DataTable({
  head,
  children,
  className,
}: {
  head: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="table-base">
        <thead>{head}</thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
