import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  return (
    <div>
      {/* Icon */}
      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-pine/20 bg-pine-soft">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-pine"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21v-1a7.5 7.5 0 0 1 15 0v1" />
        </svg>
      </div>

      <p className="eyebrow mb-2">Create your account</p>
      <h1 className="font-display text-[26px] font-medium leading-tight text-ink">
        Join Nivas
      </h1>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
        One account for booking stays and hosting. You can become a host any time.
      </p>

      <div className="mt-7">
        <RegisterForm initialRole={role === "owner" ? "owner" : "guest"} />
      </div>
    </div>
  );
}
