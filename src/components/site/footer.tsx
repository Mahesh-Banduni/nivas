import Link from "next/link";
import { Logo } from "./logo";
import { Icon } from "@/components/ui/icon";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { label: "All stays", href: "/search" },
      { label: "Destinations", href: "/destinations" },
      { label: "Beach houses", href: "/search?type=beach%20house" },
      { label: "Heritage homes", href: "/search?type=heritage" },
      { label: "Mountain cabins", href: "/search?type=cabin" },
    ],
  },
  {
    title: "Hosting",
    links: [
      { label: "List your home", href: "/become-a-host" },
      { label: "Host dashboard", href: "/owner" },
      { label: "Pricing guidance", href: "/how-it-works#hosts" },
      { label: "Trust & safety", href: "/how-it-works#trust" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "How Nivas works", href: "/how-it-works" },
      { label: "Architecture", href: "/how-it-works#architecture" },
      { label: "Admin console", href: "/admin" },
      { label: "Sign in", href: "/login" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-gradient-to-b from-cream to-white">
      <div className="container-page py-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-5 text-[14px] leading-relaxed text-ink-soft">
              A marketplace for hand-picked homes across India — built for guests, hosts and the
              team that looks after them.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold-soft/50 px-3 py-1.5 text-[11px] text-gold-deep">
                <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse-gold" />
                Powered by Cloudflare
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-pine/30 bg-pine-soft/50 px-3 py-1.5 text-[11px] text-pine-deep">
                <Icon name="database" size={11} />
                D1 Database
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate/30 bg-slate-100 px-3 py-1.5 text-[11px] text-slate-600">
                <Icon name="zap" size={11} />
                Next.js 16
              </span>
            </div>
          </div>
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="eyebrow mb-4 text-gold-deep">{column.title}</p>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] text-ink-soft transition-colors hover:text-gold-deep"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-line/50 pt-8 text-[12.5px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="text-ink-soft">© {new Date().getFullYear()} Nivas. A reference marketplace built with Next.js and Cloudflare.</p>
          <div className="flex flex-wrap items-center justify-end gap-5">
            <span className="inline-flex items-center gap-1.5 text-ink-soft">
              <Icon name="lock" size={14} className="text-gold" />
              Secure payments by Razorpay
            </span>
            <span className="inline-flex items-center gap-1.5 text-ink-soft">
              <Icon name="shield" size={14} className="text-pine" />
              Signed webhooks, idempotent events
            </span>
            <span className="inline-flex items-center gap-1.5 text-ink-soft">
              <Icon name="refresh" size={14} className="text-slate-500" />
              Real-time availability
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}