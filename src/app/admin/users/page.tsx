import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { DataTable, EmptyState, Panel, StatCard } from "@/components/ui/stat";
import { getDb } from "@/db";
import { formatDate } from "@/lib/date";
import { roleLabel } from "@/lib/labels";
import { requireRole } from "@/modules/auth/session";
import { listUsers } from "@/modules/admin/admin.service";
import { setUserStatusAction, verifyOwnerAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Users" };

const ROLE_FILTERS = ["all", "guest", "owner", "admin"] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>;
}) {
  await requireRole("admin", "/admin/users");
  const params = await searchParams;
  const db = await getDb();
  const users = await listUsers(db, 200);

  const role = (ROLE_FILTERS as readonly string[]).includes(params.role ?? "") ? params.role! : "all";
  const query = (params.q ?? "").trim().toLowerCase();
  const items = users.filter((user) => {
    const matchesRole = role === "all" || (user.roles ?? "").split(",").includes(role);
    const matchesQuery =
      !query ||
      user.full_name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query);
    return matchesRole && matchesQuery;
  });

  const owners = users.filter((user) => (user.roles ?? "").includes("owner"));
  const suspended = users.filter((user) => user.status === "suspended");
  const unverified = owners.filter((user) => user.verification_status !== "verified");

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Accounts & hosts"
        description="Every guest, host and administrator on the platform. Suspending an account revokes its sessions immediately."
        actions={
          <form method="get" className="flex items-end gap-2">
            {role !== "all" && <input type="hidden" name="role" value={role} />}
            <Field label="Search">
              <Input name="q" defaultValue={params.q ?? ""} placeholder="Name or email" className="w-52" />
            </Field>
            <Button type="submit" variant="outline" size="sm" className="mb-0.5">
              <Icon name="search" size={13} /> Find
            </Button>
          </form>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Accounts" value={String(users.length)} icon="user" hint={`${users.filter((user) => user.status === "active").length} active`} />
        <StatCard label="Hosts" value={String(owners.length)} icon="home" hint={`${unverified.length} awaiting verification`} />
        <StatCard label="Guests" value={String(users.filter((user) => (user.roles ?? "").includes("guest")).length)} icon="guests" hint="Can book stays" />
        <StatCard label="Suspended" value={String(suspended.length)} icon="lock" hint="Sessions revoked on suspension" />
      </div>

      <div className="mt-5 flex flex-wrap gap-1 border-b border-line">
        {ROLE_FILTERS.map((item) => (
          <Link
            key={item}
            href={`/admin/users?role=${item}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}`}
            className={`-mb-px border-b-2 px-3.5 py-2.5 text-[12px] capitalize transition ${
              role === item ? "border-pine font-medium text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {item}
            <span className="ml-1.5 text-[10px] text-muted">
              {item === "all" ? users.length : users.filter((user) => (user.roles ?? "").split(",").includes(item)).length}
            </span>
          </Link>
        ))}
      </div>

      <Panel className="mt-5" title="Directory" action={<span className="text-[10.5px] text-muted">{items.length} shown</span>} bodyClassName="p-0">
        {items.length ? (
          <DataTable
            head={
              <tr>
                <th>Account</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Host profile</th>
                <th>Activity</th>
                <th>Joined</th>
                <th />
              </tr>
            }
          >
            {items.map((user) => {
              const roles = (user.roles ?? "guest").split(",");
              const isOwner = roles.includes("owner");
              return (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={user.full_name} color={user.avatar_color} size={32} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{user.full_name}</p>
                        <p className="truncate text-[10px] text-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {roles.map((item) => (
                        <Badge key={item} tone={item === "admin" ? "clay" : item === "owner" ? "sky" : "neutral"} dot={false}>
                          {roleLabel(item)}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td><StatusBadge status={user.status} /></td>
                  <td>
                    {isOwner ? (
                      <div>
                        <p className="max-w-40 truncate text-[11px] text-ink">{user.business_name ?? "Independent host"}</p>
                        <p className="text-[9.5px] text-muted">{user.verification_status ?? "pending"}{user.payout_last4 ? ` · acct •${user.payout_last4}` : ""}</p>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-[10.5px] text-muted">
                    {user.property_count} homes · {user.booking_count} trips
                  </td>
                  <td className="whitespace-nowrap text-[10.5px] text-muted">{formatDate(user.created_at.slice(0, 10))}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1.5">
                      {isOwner && user.verification_status !== "verified" && (
                        <form action={verifyOwnerAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <Button type="submit" size="sm" variant="outline">
                            <Icon name="check" size={12} /> Verify
                          </Button>
                        </form>
                      )}
                      <form action={setUserStatusAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="status" value={user.status === "suspended" ? "active" : "suspended"} />
                        <Button type="submit" size="sm" variant={user.status === "suspended" ? "outline" : "ghost"}>
                          {user.status === "suspended" ? (
                            <><Icon name="refresh" size={12} /> Reactivate</>
                          ) : (
                            <><Icon name="lock" size={12} /> Suspend</>
                          )}
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        ) : (
          <EmptyState className="m-5" icon="user" title="No accounts match" description="Try clearing the search or choosing another role." />
        )}
      </Panel>
    </div>
  );
}
