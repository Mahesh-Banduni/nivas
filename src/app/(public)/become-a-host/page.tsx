import type { Metadata } from "next";
import { BecomeHostForm } from "@/components/auth/become-host-form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/modules/auth/session";
import { profileForUser } from "@/modules/auth/auth.service";

export const metadata: Metadata = { title: "Become a host" };

export default async function BecomeAHostPage() {
  const user = await getCurrentUser();
  const profile = user ? await profileForUser(user) : null;
  const isOwner = user?.roles.includes("owner");

  return (
    <main className="container-page py-12 lg:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Host account</p>
        <h1 className="display mt-2 text-[36px] text-ink">Hosting</h1>
        <div className="surface mt-6 p-5 sm:p-7">
          {isOwner ? (
            <div>
              <div className="flex items-center gap-2">
                <Badge tone="pine" dot>Host account</Badge>
                <span className="text-[11px] text-muted">{profile?.owner?.verification_status ?? "pending"}</span>
              </div>
              <h2 className="mt-3 font-display text-[22px] text-ink">Host workspace</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink href="/owner">Open dashboard</ButtonLink>
                <ButtonLink href="/owner/properties/new" variant="outline">Add a listing</ButtonLink>
              </div>
            </div>
          ) : user ? (
            <div>
              <div className="flex items-center gap-2.5">
                <Avatar name={user.name} color={user.avatarColor} size={36} />
                <div>
                  <p className="text-[13px] font-medium text-ink">{user.name}</p>
                  <p className="text-[11px] text-muted">{user.email}</p>
                </div>
              </div>
              <h2 className="mt-4 font-display text-[22px] text-ink">Create a host account</h2>
              <BecomeHostForm defaultName={`${user.name.split(" ")[0]}'s homes`} />
            </div>
          ) : (
            <div>
              <h2 className="font-display text-[22px] text-ink">Sign in or create an account</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink href="/register?role=owner">Create account</ButtonLink>
                <ButtonLink href="/login" variant="outline">Sign in</ButtonLink>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
