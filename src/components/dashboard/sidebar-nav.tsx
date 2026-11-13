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
        const active =
          item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all",
              active
                ? "border border-white/[0.1] bg-white/[0.1] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "border border-transparent text-white/55 hover:bg-white/[0.05] hover:text-white/85",
            )}
          >
            <Icon
              name={item.icon}
              size={16}
              className={cn(
                "transition-colors",
                active ? "text-white" : "text-white/40 group-hover:text-white/70",
              )}
            />
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
    <div className="hide-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-cream/80 p-1 backdrop-blur-sm">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-all",
              active
                ? "bg-white text-ink shadow-sm"
                : "text-ink-soft/80 hover:bg-white/50 hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
