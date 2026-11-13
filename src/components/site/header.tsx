"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Logo } from "./logo";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import type { CurrentUser } from "@/modules/auth/session";
import { logoutAction } from "@/app/actions";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/search", label: "Explore stays" },
  { href: "/destinations", label: "Destinations" },
];

export function SiteHeader({ user }: { user: CurrentUser | null }) {
  const isOwner = user?.roles.includes("owner");
  const isAdmin = user?.roles.includes("admin");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled
          ? "border-b border-line/60 bg-white/90 backdrop-blur-lg shadow-sm"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-page flex h-[72px] items-center justify-between gap-6">
        <div className="flex items-center gap-9">
          <Link href="/" className="flex items-center" aria-label="Nivas Home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 text-[13px] font-medium lg:flex" role="navigation" aria-label="Main navigation">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3 py-2 rounded-lg text-ink-soft transition-all",
                  "hover:text-gold hover:bg-gold-soft/50",
                  "after:absolute after:bottom-0 after:left-1/2 after:w-0 after:h-0.5 after:bg-gold after:transition-all after:duration-300 hover:after:w-1/2 hover:after:left-0",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Become a Host / Dashboard Link */}
          <Link
            href={isOwner ? "/owner" : "/become-a-host"}
            className={cn(
              "hidden px-3 py-2 rounded-lg text-[13px] font-medium transition-all",
              "text-ink-soft hover:text-gold hover:bg-gold-soft/50",
              "md:block",
            )}
          >
            {isOwner ? "Host dashboard" : "List your home"}
          </Link>

          {user ? (
            <>
              {/* Wishlist */}
              <Link
                href="/wishlist"
                aria-label="Saved stays"
                className={cn(
                  "h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition-all",
                  "hover:bg-gold-soft hover:text-gold",
                  "hidden sm:flex",
                )}
              >
                <Icon name="heart" size={18} />
              </Link>

              {/* Messages */}
              <Link
                href="/messages"
                aria-label="Messages"
                className={cn(
                  "h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition-all",
                  "hover:bg-gold-soft hover:text-gold",
                  "hidden sm:flex",
                )}
              >
                <Icon name="message" size={18} />
              </Link>

              {/* User Menu */}
              <details className="group relative hidden sm:block">
                <summary
                  className={cn(
                    "flex cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-cream py-1.5 pl-1.5 pr-3 transition-all [&::-webkit-details-marker]:hidden",
                    "hover:border-gold/50 hover:bg-white hover:shadow-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
                  )}
                  aria-label={`Account menu for ${user.name}`}
                >
                  <Avatar name={user.name} color={user.avatarColor} size={32} />
                  <span className="hidden max-w-[92px] truncate text-[13px] font-medium text-ink sm:block">
                    {user.name.split(" ")[0]}
                  </span>
                  <Icon name="chevron-down" size={13} className="text-muted transition group-open:rotate-180" />
                </summary>

                <div className="absolute right-0 z-50 mt-2.5 hidden w-64 overflow-hidden rounded-2xl border border-line bg-cream p-2 shadow-[0_24px_60px_-30px_rgba(25,23,19,0.5)] animate-scale-in group-open:block">
                  <div className="px-3 py-3 border-b border-line/50">
                    <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
                    <p className="truncate text-[11.5px] text-muted mt-0.5">{user.email}</p>
                    {user.roles.length > 1 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                          >
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              role === "admin" && "bg-gold",
                              role === "owner" && "bg-pine",
                              role === "guest" && "bg-slate-400",
                            )} />
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <nav className="py-1" aria-label="User menu">
                    {[
                      { href: "/bookings", label: "My trips", icon: "calendar" },
                      { href: "/wishlist", label: "Saved stays", icon: "heart" },
                      { href: "/messages", label: "Messages", icon: "message" },
                      { href: "/account", label: "Account", icon: "user" },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-ink-soft transition-all",
                          "hover:bg-gold-soft hover:text-gold-deep",
                        )}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sand text-muted">
                          <Icon name={item.icon} size={15} />
                        </div>
                        {item.label}
                      </Link>
                    ))}
                  </nav>

                  {(isOwner || isAdmin) && (
                    <>
                      <div className="my-1 h-px bg-line" />
                      <nav className="py-1" aria-label="Dashboard links">
                        {isOwner && (
                          <Link
                            href="/owner"
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-ink-soft transition-all",
                              "hover:bg-pine-soft hover:text-pine-deep",
                            )}
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-pine-soft text-pine">
                              <Icon name="home" size={15} />
                            </div>
                            Host dashboard
                          </Link>
                        )}
                        {isAdmin && (
                          <Link
                            href="/admin"
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-ink-soft transition-all",
                              "hover:bg-gold-soft hover:text-gold-deep",
                            )}
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-gold-deep">
                              <Icon name="shield" size={15} />
                            </div>
                            Admin console
                          </Link>
                        )}
                      </nav>
                    </>
                  )}

                  <div className="my-1 h-px bg-line" />
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] text-ink-soft transition-all",
                        "hover:bg-rose-soft hover:text-rose",
                      )}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-soft text-rose">
                        <Icon name="logout" size={15} />
                      </div>
                      Sign out
                    </button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  "hidden px-3 py-2 rounded-lg text-[13px] font-medium transition-all",
                  "text-ink-soft hover:text-gold hover:bg-gold-soft/50",
                  "sm:block",
                )}
              >
                Sign in
              </Link>
              <ButtonLink href="/register" variant="primary" size="sm" className="hidden sm:inline-flex">
                Create account
              </ButtonLink>
              <ButtonLink href="/login" variant="primary" size="sm" className="sm:hidden">
                Sign in
              </ButtonLink>
            </>
          )}

          {/* Mobile Menu Button */}
          <button
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-cream text-ink-soft transition-all lg:hidden",
              "hover:bg-gold-soft hover:text-gold hover:border-gold/50",
            )}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <Icon name={mobileMenuOpen ? "x" : "menu"} size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="lg:hidden animate-slide-up border-t border-line bg-white"
        >
          <div className="container-page py-4 space-y-3">
            <nav className="space-y-1" aria-label="Mobile navigation">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "block rounded-xl px-4 py-3 text-[14px] font-medium transition-all",
                    "text-ink-soft hover:text-gold hover:bg-gold-soft/50",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {user && (
              <nav className="space-y-1 border-t border-line pt-3" aria-label="Your account">
                {[
                  { href: "/bookings", label: "My trips" },
                  { href: "/wishlist", label: "Saved stays" },
                  { href: "/messages", label: "Messages" },
                  { href: "/account", label: "Account" },
                  ...(isOwner ? [{ href: "/owner", label: "Host dashboard" }] : []),
                  ...(isAdmin ? [{ href: "/admin", label: "Admin console" }] : []),
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-xl px-4 py-3 text-[14px] font-medium text-ink-soft transition-all hover:bg-gold-soft/50 hover:text-gold"
                  >
                    {item.label}
                  </Link>
                ))}
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full rounded-xl px-4 py-3 text-left text-[14px] font-medium text-ink-soft transition-all hover:bg-rose-soft hover:text-rose"
                  >
                    Sign out
                  </button>
                </form>
              </nav>
            )}

            {!isOwner && (
              <Link
                href="/become-a-host"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block rounded-xl px-4 py-3 text-center text-[14px] font-medium transition-all",
                  "text-ink-soft hover:text-gold hover:bg-gold-soft/50 border border-line",
                )}
              >
                List your home
              </Link>
            )}

            {!user && (
              <div className="space-y-2 pt-2 border-t border-line">
                <ButtonLink href="/register" variant="primary" fullWidth size="lg" onClick={() => setMobileMenuOpen(false)}>
                  Create account
                </ButtonLink>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}