"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";

const DEMOS = [
  { label: "Guest", email: "kavya@nivas.test", detail: "Kavya · trips & saved stays" },
  { label: "Host", email: "arjun@nivas.test", detail: "Arjun · 3 listings & earnings" },
  { label: "Admin", email: "admin@nivas.test", detail: "Platform operations" },
];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("kavya@nivas.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not sign in");
      router.push(next);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in");
      setPending(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email address" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <FormError>{error}</FormError>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
          {!pending && <Icon name="arrow-right" size={15} />}
        </Button>
      </form>

      <div className="mt-7 rounded-xl border border-line bg-cream/70 p-4">
        <p className="eyebrow mb-2.5">Demo accounts · password123</p>
        <div className="space-y-1.5">
          {DEMOS.map((demo) => (
            <button
              key={demo.email}
              type="button"
              onClick={() => {
                setEmail(demo.email);
                setPassword("password123");
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${
                email === demo.email
                  ? "border-pine/40 bg-pine-soft/60"
                  : "border-line bg-cream hover:border-line-strong"
              }`}
            >
              <span>
                <span className="block text-[12.5px] font-medium text-ink">{demo.label}</span>
                <span className="block text-[11px] text-muted">{demo.detail}</span>
              </span>
              <span className="text-[11px] text-muted">{demo.email}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-[13px] text-muted">
        New to Nivas?{" "}
        <Link href="/register" className="link-underline font-medium text-ink">
          Create an account
        </Link>
      </p>
    </div>
  );
}
