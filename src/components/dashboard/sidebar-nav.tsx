"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition",
              active
                ? "bg-pine text-cream shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "text-ink-soft hover:bg-sand/70 hover:text-ink",
            )}
          >
            <Icon name={item.icon} size={16} className={active ? "text-cream" : "text-muted"} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function TabNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <div className="hide-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-cream p-1">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] transition",
              active ? "bg-pine text-cream" : "text-ink-soft hover:bg-sand/70",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
