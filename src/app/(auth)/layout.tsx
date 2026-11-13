import { Logo } from "@/components/site/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-8">
        <Logo />
        <a href="/" className="text-[12px] text-muted hover:text-ink">
          Back to marketplace
        </a>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
