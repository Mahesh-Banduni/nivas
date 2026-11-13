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
      <p className="eyebrow">Join the marketplace</p>
      <h1 className="display mt-3 text-[34px] leading-tight text-ink">Create your account</h1>
      <p className="mt-2 text-[13.5px] text-muted">
        One account for booking stays and hosting them. You can become a host at any time.
      </p>
      <div className="mt-8">
        <RegisterForm initialRole={role === "owner" ? "owner" : "guest"} />
      </div>
    </div>
  );
}
