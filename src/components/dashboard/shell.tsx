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
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-[#f4efe5] lg:flex">
        <div className="px-5 pb-5 pt-6">
          <Logo />
        </div>
        <div className="px-5">
          <div className="rounded-xl border border-line bg-cream/70 px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <Avatar name={user.name} color={user.avatarColor} size={32} />
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-ink">{user.name}</p>
                <p className="truncate text-[10.5px] uppercase tracking-[0.1em] text-muted">{roleLabel}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 flex-1 overflow-y-auto px-3">
          <SidebarNav items={nav} />
          <div className="mt-6 border-t border-line pt-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-muted hover:bg-sand/70 hover:text-ink"
            >
              <Icon name="external" size={14} />
              View marketplace
            </Link>
          </div>
        </div>
        <div className="border-t border-line p-3">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-muted hover:bg-sand/70 hover:text-ink"
            >
              <Icon name="logout" size={14} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-paper/90 px-4 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <Logo />
          </div>
          <div className="hidden items-center gap-2 text-[12px] text-muted lg:flex">
            <span className="rounded-full border border-line bg-cream px-2.5 py-1 uppercase tracking-[0.1em]">
              {roleLabel}
            </span>
            <span className="text-line-strong">/</span>
            <span>Live workspace</span>
          </div>
          <div className="flex items-center gap-2">
            {messagesHref && (
              <Link
                href={messagesHref}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream text-ink-soft"
                aria-label="Messages"
              >
                <Icon name="message" size={15} />
              </Link>
            )}
            <details className="group relative lg:hidden">
              <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-cream text-ink-soft [&::-webkit-details-marker]:hidden">
                <Icon name="menu" size={16} />
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-line bg-cream p-1.5 shadow-lg">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-ink-soft hover:bg-sand/70"
                  >
                    <Icon name={item.icon} size={15} className="text-muted" />
                    {item.label}
                  </Link>
                ))}
                <div className="my-1 h-px bg-line" />
                <form action={logoutAction}>
                  <button type="submit" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-ink-soft hover:bg-sand/70">
                    <Icon name="logout" size={15} className="text-muted" />
                    Sign out
                  </button>
                </form>
              </div>
            </details>
            <div className="hidden items-center gap-2.5 rounded-full border border-line bg-cream py-1 pl-1 pr-3 sm:flex">
              <Avatar name={user.name} color={user.avatarColor} size={28} />
              <span className="text-[12px] text-ink">{user.name.split(" ")[0]}</span>
            </div>
          </div>
        </header>
        <div className="px-4 py-7 sm:px-6 lg:px-8 lg:py-9">{children}</div>
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
    <div className="mb-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h1 className="display text-[30px] leading-[1.05] text-ink sm:text-[34px]">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
