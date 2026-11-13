import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div>
      <p className="eyebrow">Welcome back</p>
      <h1 className="display mt-3 text-[34px] leading-tight text-ink">Sign in to Nivas</h1>
      <p className="mt-2 text-[13.5px] text-muted">
        Manage trips, message hosts and keep an eye on your listings.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-sand/60" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
