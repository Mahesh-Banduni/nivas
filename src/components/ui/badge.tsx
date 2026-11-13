import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "gold" | "pine" | "clay" | "rose" | "slate" | "emerald" | "amber" | "neutral" | "sky";

const TONES: Record<Tone, string> = {
  gold: "badge-gold",
  pine: "badge-pine",
  clay: "badge-clay",
  rose: "badge-rose",
  slate: "badge-slate",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
}

export function Badge({
  tone = "gold",
  children,
  className,
  dot = false,
  size = "md",
  icon,
}: BadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-3 py-1 text-[11px] gap-1.5",
    lg: "px-4 py-1.5 text-[12px] gap-2",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full border",
        sizeClasses[size],
        TONES[tone],
        className,
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  dot?: boolean;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function StatusBadge({ status, dot = true, size = "md", showIcon = false }: StatusBadgeProps) {
  const statusConfig: Record<string, { label: string; tone: Tone; icon?: ReactNode }> = {
    // Booking statuses
    held: { label: "Held", tone: "amber", icon: "⏳" },
    booked: { label: "Confirmed", tone: "pine", icon: "✓" },
    cancelled: { label: "Cancelled", tone: "rose", icon: "✕" },
    expired: { label: "Expired", tone: "slate", icon: "⏱" },
    pending: { label: "Pending", tone: "amber", icon: "⏳" },
    confirmed: { label: "Confirmed", tone: "pine", icon: "✓" },
    completed: { label: "Completed", tone: "emerald", icon: "✓" },

    // Property statuses
    draft: { label: "Draft", tone: "slate", icon: "📝" },
    pending_review: { label: "Pending Review", tone: "amber", icon: "🔍" },
    published: { label: "Published", tone: "pine", icon: "🌐" },
    rejected: { label: "Rejected", tone: "rose", icon: "⛔" },
    suspended: { label: "Suspended", tone: "clay", icon: "⏸" },
    featured: { label: "Featured", tone: "gold", icon: "★" },

    // Payment statuses
    created: { label: "Created", tone: "slate" },
    paid: { label: "Paid", tone: "pine" },
    failed: { label: "Failed", tone: "rose" },
    refunded: { label: "Refunded", tone: "clay" },
    refund_pending: { label: "Refund Pending", tone: "amber" },

    // Verification
    verified: { label: "Verified", tone: "pine", icon: "✓" },
    unverified: { label: "Unverified", tone: "slate" },

    // User roles
    guest: { label: "Guest", tone: "slate" },
    owner: { label: "Owner", tone: "pine" },
    admin: { label: "Admin", tone: "gold" },
  };

  const config = statusConfig[status] ?? { label: status, tone: "slate" };

  return (
    <Badge tone={config.tone} dot={dot} size={size} icon={showIcon ? config.icon : undefined}>
      {config.label}
    </Badge>
  );
}

interface DotBadgeProps {
  color?: "gold" | "pine" | "rose" | "emerald" | "amber" | "slate";
  size?: number;
  className?: string;
}

export function DotBadge({ color = "pine", size = 8, className }: DotBadgeProps) {
  const colors: Record<string, string> = {
    gold: "bg-gold",
    pine: "bg-pine",
    rose: "bg-rose",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    slate: "bg-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-block rounded-full",
        colors[color],
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}

interface CountBadgeProps {
  count: number;
  max?: number;
  tone?: Tone;
  className?: string;
}

export function CountBadge({ count, max = 99, tone = "gold", className }: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : String(count);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[10px] font-bold",
        TONES[tone],
        className,
      )}
    >
      {displayCount}
    </span>
  );
}