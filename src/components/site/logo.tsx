import Link from "next/link";
import { LogoMark } from "@/components/ui/icon";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2.5 ${className}`} aria-label="Nivas home">
      <div className="group-hover:rotate-3 transition-transform duration-500">
        <LogoMark size={34} className="text-gold group-hover:text-gold-deep transition-colors" />
      </div>
      <span className="flex flex-col leading-none">
        <span className="display text-[24px] tracking-[-0.04em] text-ink group-hover:text-gold-deep transition-colors">
          nivas
        </span>
      </span>
    </Link>
  );
}