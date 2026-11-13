import Link from "next/link";
import { Logo } from "@/components/site/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="flex h-[60px] items-center justify-between border-b border-line/60 bg-white px-5 sm:px-8">
        <Logo />
        <a
          href="/"
          className="text-[12.5px] font-medium text-muted transition-colors hover:text-ink"
        >
          ← Back to marketplace
        </a>
      </header>

      {/* Main */}
      <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-[#faf7f0] to-[#f5f0e5] px-5 py-12 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl border border-line bg-white p-7 shadow-[0_4px_24px_rgba(26,23,19,0.07)] sm:p-9">
            {children}
          </div>
          <p className="mt-5 text-center text-[12px] text-muted">
            Nivas · Secure &amp; verified platform
          </p>
        </div>
      </main>
    </div>
  );
}
