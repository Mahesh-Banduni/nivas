import Link from "next/link";
import { LogoMark } from "@/components/ui/icon";

export function Logo({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2.5 ${className}`} aria-label="Nivas home">
      <div className="transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
        <LogoMark
          size={32}
          className={dark ? "text-gold group-hover:text-gold-light transition-colors" : "text-gold group-hover:text-gold-deep transition-colors"}
        />
      </div>
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-[22px] font-bold tracking-[-0.05em] transition-colors ${
            dark
              ? "text-white/90 group-hover:text-white"
              : "text-ink group-hover:text-gold-deep"
          }`}
        >
          nivas
        </span>
      </span>
    </Link>
  );
}
