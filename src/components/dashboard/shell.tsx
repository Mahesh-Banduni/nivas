import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/site/logo";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { logoutAction } from "@/app/actions";
import type { CurrentUser } from "@/modules/auth/session";
import { SidebarNav, type NavItem } from "./sidebar-nav";

export function DashboardShell({
  user,
  nav,
  roleLabel,
  messagesHref = "/messages",
  children,
}: {
  user: CurrentUser;
  nav: NavItem[];
  roleLabel: string;
  messagesHref?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* ── Dark Sidebar ── */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-white/[0.06] bg-[#1a1613] lg:flex">
        {/* Logo */}
        <div className="px-4 pb-5 pt-5">
          <Logo dark />
        </div>

        {/* User card */}
        <div className="px-4">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.07] px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <Avatar name={user.name} color={user.avatarColor} size={32} />
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-white/90">{user.name}</p>
                <p className="truncate text-[10px] uppercase tracking-[0.12em] text-white/40">{roleLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="mt-5 flex-1 overflow-y-auto px-3">
          <SidebarNav items={nav} />

          <div className="mt-6 border-t border-white/[0.06] pt-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] font-medium text-white/40 transition-all hover:bg-white/[0.05] hover:text-white/75"
            >
              <Icon name="external" size={14} />
              View marketplace
            </Link>
          </div>
        </div>

        {/* Sign out */}
        <div className="border-t border-white/[0.06] p-3">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[12.5px] font-medium text-white/40 transition-all hover:bg-white/[0.05] hover:text-white/75"
            >
              <Icon name="logout" size={14} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line/60 bg-white/92 px-4 backdrop-blur-md lg:px-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <Logo />
          </div>

          {/* Desktop breadcrumb */}
          <div className="hidden items-center gap-2 text-[12px] lg:flex">
            <span className="rounded-full border border-gold/20 bg-gold-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-deep">
              {roleLabel}
            </span>
            <span className="text-muted">·</span>
            <span className="font-medium text-ink-soft">Live workspace</span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {messagesHref && (
              <Link
                href={messagesHref}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream/80 text-ink-soft transition-all hover:border-gold/30 hover:bg-gold-soft hover:text-gold-deep"
                aria-label="Messages"
              >
                <Icon name="message" size={15} />
              </Link>
            )}

            {/* Mobile menu */}
            <details className="group relative lg:hidden">
              <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-cream/80 text-ink-soft [&::-webkit-details-marker]:hidden">
                <Icon name="menu" size={16} />
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-xl">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-ink-soft transition-all hover:bg-cream hover:text-ink"
                  >
                    <Icon name={item.icon} size={15} className="text-muted" />
                    {item.label}
                  </Link>
                ))}
                <div className="my-1 h-px bg-line" />
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-ink-soft transition-all hover:bg-rose-soft hover:text-rose"
                  >
                    <Icon name="logout" size={15} className="text-muted" />
                    Sign out
                  </button>
                </form>
              </div>
            </details>

            {/* Avatar pill */}
            <div className="hidden items-center gap-2.5 rounded-full border border-line bg-cream/80 py-1 pl-1 pr-3 sm:flex">
              <Avatar name={user.name} color={user.avatarColor} size={28} />
              <span className="text-[12px] font-medium text-ink">{user.name.split(" ")[0]}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h1 className="display text-[28px] leading-[1.05] text-ink sm:text-[32px]">{title}</h1>
          {description && (
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
