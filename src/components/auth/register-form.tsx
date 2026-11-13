"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export function RegisterForm({ initialRole = "guest" }: { initialRole?: "guest" | "owner" }) {
  const router = useRouter();
  const [role, setRole] = useState<"guest" | "owner">(initialRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role,
          businessName: role === "owner" ? businessName : undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not create your account");
      router.push(role === "owner" ? "/owner" : "/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create your account");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Role selector */}
      <div>
        <p className="label mb-2">I want to</p>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { value: "guest" as const, label: "Book stays", detail: "Find & reserve properties" },
            { value: "owner" as const, label: "List my home", detail: "Become a verified host" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRole(option.value)}
              className={cn(
                "rounded-xl border px-4 py-3.5 text-left transition-all",
                role === option.value
                  ? "border-pine bg-pine-soft/50 shadow-sm"
                  : "border-line bg-cream/60 hover:border-line-strong hover:bg-cream",
              )}
            >
              <span className="block text-[13.5px] font-semibold text-ink">{option.label}</span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">{option.detail}</span>
            </button>
          ))}
        </div>
      </div>

      <Field label="Full name" htmlFor="fullName">
        <Input
          id="fullName"
          required
          minLength={2}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Your full name"
          autoComplete="name"
        />
      </Field>

      <Field label="Email address" htmlFor="email">
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </Field>

      <Field label="Password" htmlFor="password" hint="Minimum 8 characters.">
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </Field>

      {role === "owner" && (
        <Field
          label="Hosting business name"
          htmlFor="businessName"
          hint="This name appears on your listings."
        >
          <Input
            id="businessName"
            required
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="e.g. Priya's Escapes"
          />
        </Field>
      )}

      <FormError>{error}</FormError>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
        {!pending && <Icon name="arrow-right" size={15} />}
      </Button>

      <p className="text-center text-[11.5px] leading-relaxed text-muted">
        By continuing you agree to the Nivas marketplace terms and privacy policy. Payments are
        processed by Razorpay.
      </p>

      <p className="text-center text-[13px] text-muted">
        Already have an account?{" "}
        <Link href="/login" className="link-underline font-medium text-ink">
          Sign in
        </Link>
      </p>
    </form>
  );
}
