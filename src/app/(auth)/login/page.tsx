import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div>
      {/* Icon */}
      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-gold/20 bg-gold-soft">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-gold-deep"
          aria-hidden="true"
        >
          <rect x="4" y="10" width="16" height="11" rx="2.5" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      </div>

      <p className="eyebrow mb-2">Welcome back</p>
      <h1 className="font-display text-[26px] font-medium leading-tight text-ink">
        Sign in to Nivas
      </h1>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
        Manage your trips, message hosts, and discover new stays.
      </p>

      <div className="mt-7">
        <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-sand/60" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
