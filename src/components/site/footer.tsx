import Link from "next/link";
import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { label: "All stays", href: "/search" },
      { label: "Destinations", href: "/destinations" },
    ],
  },
  {
    title: "Hosting",
    links: [
      { label: "List your home", href: "/become-a-host" },
      { label: "Host dashboard", href: "/owner" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/register" },
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
          <p className="text-ink-soft">© {new Date().getFullYear()} Nivas.</p>
        </div>
      </div>
    </footer>
  );
}